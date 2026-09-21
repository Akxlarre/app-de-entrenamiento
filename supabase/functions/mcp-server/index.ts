import { Server } from 'npm:@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from 'npm:@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from 'npm:@modelcontextprotocol/sdk/types.js';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ============================================================================
// CONFIGURACIÓN DE SUPABASE
// ============================================================================
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

/**
 * Valida el token Bearer JWT enviado en el header Authorization.
 * Devuelve los datos del usuario si es válido, o null si falla.
 */
async function authenticateUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  // Usamos la anon key + JWT del usuario para autenticar y obtener su usuario verificado
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    console.error('[MCP Auth Error]:', error?.message);
    return null;
  }

  return user;
}

// ============================================================================
// EJECUCIÓN DIRECTA DE HERRAMIENTAS (Core Tool Runner)
// ============================================================================
async function executeTool(authenticatedUserId: string, toolName: string, args: any) {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  console.log(`[MCP] Tool ejecutada por Usuario (${authenticatedUserId}): ${toolName}`);

  if (toolName === 'obtener_mis_rutinas') {
    const { data, error } = await supabase
      .from('routines')
      .select(
        `
        id, 
        name, 
        notes, 
        created_at,
        routine_exercises (
          id,
          order_index,
          exercises (
            id,
            name_es,
            name_en,
            muscle,
            equipment,
            category
          )
        )
      `
      )
      .eq('user_id', authenticatedUserId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const formatted = (data || []).map((r: any) => ({
      ...r,
      routine_exercises: (r.routine_exercises || []).sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      ),
    }));

    return { content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }] };
  }

  if (toolName === 'obtener_mis_entrenamientos_recientes') {
    const limit = args?.limit ?? 5;
    const { data, error } = await supabase
      .from('workouts')
      .select(
        'id, routine_id, start_time, end_time, notes, routines(name), workout_reports(energy_level, session_rpe, satisfaction_rating, notes)'
      )
      .eq('user_id', authenticatedUserId)
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  if (toolName === 'obtener_series_de_entrenamiento') {
    const { data: workout, error: workoutErr } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', args.workout_id)
      .eq('user_id', authenticatedUserId)
      .single();

    if (workoutErr || !workout) {
      throw new Error('No tienes acceso a esta sesión de entrenamiento o no existe.');
    }

    const { data, error } = await supabase
      .from('workout_sets')
      .select(
        'id, set_number, set_type, weight, reps, rir, rpe, completed, exercises(name_es, name_en)'
      )
      .eq('workout_id', args.workout_id)
      .order('set_number', { ascending: true });

    if (error) throw new Error(error.message);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  if (toolName === 'crear_rutina') {
    const { data: newRoutine, error: routineErr } = await supabase
      .from('routines')
      .insert({
        user_id: authenticatedUserId,
        name: args.name,
        notes: args.notes ?? null,
      })
      .select()
      .single();

    if (routineErr || !newRoutine) {
      throw new Error(`Error al crear la rutina: ${routineErr?.message}`);
    }

    if (Array.isArray(args.exercises) && args.exercises.length > 0) {
      const exerciseRows = args.exercises.map((ex: any, idx: number) => ({
        routine_id: newRoutine.id,
        exercise_id: ex.exercise_id,
        order_index: ex.order_index ?? idx,
      }));

      const { error: exErr } = await supabase.from('routine_exercises').insert(exerciseRows);

      if (exErr) {
        console.error('[MCP crear_rutina] Error insertando ejercicios:', exErr);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { message: 'Rutina creada exitosamente', routine: newRoutine },
            null,
            2
          ),
        },
      ],
    };
  }

  if (toolName === 'eliminar_rutina') {
    if (!args?.routine_id) {
      throw new Error('El parámetro routine_id es obligatorio.');
    }

    const { data, error } = await supabase
      .from('routines')
      .delete()
      .eq('id', args.routine_id)
      .eq('user_id', authenticatedUserId)
      .select();

    // 23503 = foreign_key_violation: la rutina está en uso por un plan
    // (mesocycle_sessions.routine_id es ON DELETE RESTRICT desde fix-026).
    // Se devuelve en español para que el Coach pueda explicárselo al usuario
    // en vez de relayar el mensaje interno de Postgres.
    if (error?.code === '23503') {
      throw new Error(
        'No se puede eliminar esta rutina porque forma parte de un plan de entrenamiento. ' +
          'Para eliminarla, primero elimina el plan que la usa.'
      );
    }
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error('No se encontró la rutina o no tienes permiso para eliminarla.');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { message: 'Rutina eliminada exitosamente', deleted_routine_id: args.routine_id },
            null,
            2
          ),
        },
      ],
    };
  }

  if (toolName === 'guardar_recuerdo') {
    const { data, error } = await supabase
      .from('user_memory')
      .insert({
        user_id: authenticatedUserId,
        category: args.category,
        content: args.content,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'Recuerdo guardado exitosamente', data }, null, 2),
        },
      ],
    };
  }

  if (toolName === 'eliminar_recuerdo') {
    if (!args?.memory_id) {
      throw new Error('El parámetro memory_id es obligatorio.');
    }

    const { data, error } = await supabase
      .from('user_memory')
      .delete()
      .eq('id', args.memory_id)
      .eq('user_id', authenticatedUserId)
      .select();

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error('No se encontró el recuerdo o no tienes permiso para eliminarlo.');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'Recuerdo eliminado exitosamente' }, null, 2),
        },
      ],
    };
  }

  if (toolName === 'buscar_ejercicios') {
    const limit = args?.limit ?? 10;
    let query = supabase
      .from('exercises')
      .select('id, name_es, name_en, category, muscle, equipment');

    if (args?.search) {
      query = query.or(`name_es.ilike.%${args.search}%,name_en.ilike.%${args.search}%`);
    }

    if (args?.muscle) {
      query = query.eq('muscle', args.muscle);
    }

    const { data, error } = await query.limit(limit);

    if (error) throw new Error(error.message);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  if (toolName === 'obtener_entrenamiento_en_curso') {
    const { data: workout, error: workoutErr } = await supabase
      .from('workouts')
      .select(
        `
        id, 
        routine_id, 
        start_time, 
        notes,
        routines (
          id,
          name
        )
      `
      )
      .eq('user_id', authenticatedUserId)
      .is('end_time', null)
      .single();

    if (workoutErr) {
      if (workoutErr.code === 'PGRST116') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'No tienes ningún entrenamiento en curso actualmente.' },
                null,
                2
              ),
            },
          ],
        };
      }
      throw new Error(workoutErr.message);
    }

    const { data: sets, error: setsErr } = await supabase
      .from('workout_sets')
      .select(
        'id, set_number, set_type, weight, reps, rir, rpe, completed, completed_at, exercises(name_es, name_en)'
      )
      .eq('workout_id', workout.id)
      .eq('completed', true)
      .order('set_number', { ascending: true });

    if (setsErr) throw new Error(setsErr.message);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ workout, sets }, null, 2),
        },
      ],
    };
  }

  if (toolName === 'obtener_mesociclo_activo') {
    const { data: meso, error: mesoErr } = await supabase
      .from('mesocycles')
      .select(
        `
        id, name, duration_weeks, current_week, status, created_at,
        weeks:mesocycle_weeks (
          id, week_number, is_deload, focus_notes,
          sessions:mesocycle_sessions (
            id, day_number, status,
            routine:routines (id, name),
            targets:mesocycle_session_targets (
              set_number, target_weight, target_reps, target_rir,
              exercises (id, name_es, name_en)
            )
          )
        )
      `
      )
      .eq('user_id', authenticatedUserId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mesoErr) throw new Error(mesoErr.message);

    if (!meso) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { active_mesocycle: null, message: 'El usuario no tiene ningún mesociclo activo.' },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ active_mesocycle: meso }, null, 2) }],
    };
  }

  if (toolName === 'crear_mesociclo_completo') {
    const { name, duration_weeks, weekly_sessions } = args;

    // Validación previa: sin esto, violar UNIQUE(week_id, day_number) o mandar
    // un routine_id nulo devuelve un error crudo de Postgres que el modelo no
    // sabe corregir. Estos mensajes sí son accionables.
    if (!Array.isArray(weekly_sessions) || weekly_sessions.length === 0) {
      throw new Error(
        'weekly_sessions debe ser un array con al menos una sesión. Describe UNA semana tipo; se repite sola en todas las semanas.'
      );
    }
    if (!Number.isInteger(duration_weeks) || duration_weeks < 1) {
      throw new Error('duration_weeks debe ser un entero mayor o igual a 1.');
    }
    const dayNumbers = weekly_sessions.map((s: any) => s?.day_number);
    if (dayNumbers.some((d: any) => !Number.isInteger(d) || d < 1 || d > 7)) {
      throw new Error('Cada sesión necesita un day_number entero entre 1 (lunes) y 7 (domingo).');
    }
    if (new Set(dayNumbers).size !== dayNumbers.length) {
      throw new Error(
        'Hay day_number repetidos en weekly_sessions. Cada día de la semana puede aparecer una sola vez.'
      );
    }
    if (weekly_sessions.some((s: any) => !s?.routine_id)) {
      throw new Error(
        'Cada sesión necesita un routine_id real del usuario. Llama a obtener_mis_rutinas para conseguirlos.'
      );
    }

    // La BD ahora garantiza un solo mesociclo activo por usuario (índice único
    // parcial mesocycles_one_active_per_user). Sin este pre-chequeo el insert
    // fallaría con un error de constraint que el modelo no sabe interpretar.
    const { data: activo, error: activoErr } = await supabase
      .from('mesocycles')
      .select('id, name')
      .eq('user_id', authenticatedUserId)
      .eq('status', 'active')
      // order+limit y no maybeSingle a secas: si la migración del índice único
      // todavía no corrió en este entorno, puede haber más de un activo y
      // maybeSingle reventaría.
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activoErr) throw new Error(activoErr.message);

    if (activo) {
      if (!args?.reemplazar_activo) {
        throw new Error(
          `El usuario ya tiene un mesociclo activo ("${activo.name}"). Creá uno nuevo sólo si te lo confirma explícitamente: avisale que el plan actual pasará a abandonado y volvé a llamar a esta herramienta con reemplazar_activo=true.`
        );
      }

      const { error: abandonErr } = await supabase
        .from('mesocycles')
        .update({ status: 'abandoned' })
        .eq('id', activo.id);

      if (abandonErr)
        throw new Error('No se pudo archivar el plan anterior: ' + abandonErr.message);
    }

    const mesocycleId = crypto.randomUUID();

    // 1. Insertar Mesociclo
    const { error: mErr } = await supabase.from('mesocycles').insert({
      id: mesocycleId,
      user_id: authenticatedUserId,
      name,
      duration_weeks,
    });
    if (mErr) throw new Error('Error creando mesociclo: ' + mErr.message);

    // 2. Insertar Semanas, Sesiones y Targets
    const weeksToInsert = [];
    const sessionsToInsert = [];
    const targetsToInsert = [];

    for (let w = 1; w <= duration_weeks; w++) {
      const weekId = crypto.randomUUID();
      weeksToInsert.push({
        id: weekId,
        mesocycle_id: mesocycleId,
        user_id: authenticatedUserId,
        week_number: w,
        is_deload: w === duration_weeks, // Última semana de deload por default
      });

      for (const sess of weekly_sessions) {
        const sessionId = crypto.randomUUID();
        sessionsToInsert.push({
          id: sessionId,
          week_id: weekId,
          user_id: authenticatedUserId,
          day_number: sess.day_number,
          routine_id: sess.routine_id,
        });

        if (sess.targets && Array.isArray(sess.targets)) {
          for (const tgt of sess.targets) {
            targetsToInsert.push({
              id: crypto.randomUUID(),
              session_id: sessionId,
              user_id: authenticatedUserId,
              exercise_id: tgt.exercise_id,
              set_number: tgt.set_number,
              target_weight: tgt.target_weight,
              target_reps: tgt.target_reps,
              target_rir: tgt.target_rir,
            });
          }
        }
      }
    }

    const { error: wErr } = await supabase.from('mesocycle_weeks').insert(weeksToInsert);
    if (wErr) throw new Error('Error en weeks: ' + wErr.message);

    const { error: sErr } = await supabase.from('mesocycle_sessions').insert(sessionsToInsert);
    if (sErr) throw new Error('Error en sessions: ' + sErr.message);

    if (targetsToInsert.length > 0) {
      const { error: tErr } = await supabase
        .from('mesocycle_session_targets')
        .insert(targetsToInsert);
      if (tErr) throw new Error('Error en targets: ' + tErr.message);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'Mesociclo generado exitosamente', id: mesocycleId }),
        },
      ],
    };
  }

  if (toolName === 'analizar_volumen_muscular') {
    const daysAgo = args?.days_ago ?? 7;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - daysAgo);

    const { data: workouts, error: workoutErr } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', authenticatedUserId)
      .gte('start_time', dateLimit.toISOString());

    if (workoutErr) throw new Error(workoutErr.message);

    const workoutIds = workouts.map((w: any) => w.id);
    if (workoutIds.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No se encontraron entrenamientos en el periodo solicitado.',
            }),
          },
        ],
      };
    }

    const { data: sets, error: setsErr } = await supabase
      .from('workout_sets')
      .select(
        `
        weight, 
        reps,
        set_type,
        exercises ( muscle )
      `
      )
      .in('workout_id', workoutIds)
      .eq('completed', true);

    if (setsErr) throw new Error(setsErr.message);

    const volumeByMuscle: Record<string, { totalSets: number; totalTonnage: number }> = {};

    for (const set of sets || []) {
      if (set.set_type === 'warmup') continue;
      const muscle = (set.exercises as any)?.muscle || 'unknown';
      const w = Number(set.weight) || 0;
      const r = Number(set.reps) || 0;

      if (!volumeByMuscle[muscle]) volumeByMuscle[muscle] = { totalSets: 0, totalTonnage: 0 };
      volumeByMuscle[muscle].totalSets += 1;
      volumeByMuscle[muscle].totalTonnage += w * r;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ days_analyzed: daysAgo, volume: volumeByMuscle }, null, 2),
        },
      ],
    };
  }

  if (toolName === 'analizar_progresion_ejercicio') {
    if (!args?.exercise_id) throw new Error('exercise_id es requerido');

    const { data: sets, error } = await supabase
      .from('workout_sets')
      .select(
        `
        weight,
        reps,
        rir,
        set_type,
        workouts!inner ( id, start_time, user_id )
      `
      )
      .eq('exercise_id', args.exercise_id)
      .eq('workouts.user_id', authenticatedUserId)
      .eq('completed', true);

    if (error) throw new Error(error.message);

    const workoutStats: Record<
      string,
      { date: string; maxWeight: number; estimated1RM: number; avgRir: number; countRir: number }
    > = {};

    for (const set of sets || []) {
      if (set.set_type === 'warmup') continue;
      const wId = (set.workouts as any).id;
      const date = (set.workouts as any).start_time;
      const w = Number(set.weight) || 0;
      const r = Number(set.reps) || 0;
      const epley1RM = w * (1 + 0.0333 * r);

      if (!workoutStats[wId]) {
        workoutStats[wId] = { date, maxWeight: w, estimated1RM: epley1RM, avgRir: 0, countRir: 0 };
      }

      if (w > workoutStats[wId].maxWeight) workoutStats[wId].maxWeight = w;
      if (epley1RM > workoutStats[wId].estimated1RM) workoutStats[wId].estimated1RM = epley1RM;

      if (set.rir != null) {
        workoutStats[wId].avgRir += Number(set.rir);
        workoutStats[wId].countRir += 1;
      }
    }

    const progression = Object.values(workoutStats)
      .map((s) => ({
        date: s.date,
        maxWeight: s.maxWeight,
        estimated1RM: Math.round(s.estimated1RM * 10) / 10,
        avgRir: s.countRir > 0 ? Math.round((s.avgRir / s.countRir) * 10) / 10 : null,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ exercise_id: args.exercise_id, progression }, null, 2),
        },
      ],
    };
  }

  if (toolName === 'analizar_historial_feedback') {
    const limit = args?.limit ?? 10;
    let query = supabase
      .from('workout_exercise_feedback')
      .select(
        'id, workout_id, category, rating, tags, notes, created_at, exercises(name_es, name_en)'
      )
      .eq('user_id', authenticatedUserId)
      .order('created_at', { ascending: false });

    if (args?.exercise_id) {
      query = query.eq('exercise_id', args.exercise_id);
    }

    const { data, error } = await query.limit(limit);

    if (error) throw new Error(error.message);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  throw new Error(`Herramienta no encontrada: ${toolName}`);
}

// ============================================================================
// FACTORY: Crea un Server MCP amarrado ÚNICAMENTE al usuario autenticado
// ============================================================================
function createSecureMcpServer(authenticatedUserId: string) {
  const server = new Server(
    { name: 'entrenamiento-mcp-seguro', version: '1.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'obtener_mis_rutinas',
        description:
          'Obtiene las plantillas de rutinas del usuario con sus ejercicios completos ordenados, músculos y categorías.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'obtener_mis_entrenamientos_recientes',
        description: 'Obtiene el historial reciente de entrenamientos del usuario autenticado.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Cantidad de sesiones. Default: 5' },
          },
        },
      },
      {
        name: 'guardar_recuerdo',
        description:
          'Guarda un hecho importante o preferencia del usuario a largo plazo para futuras sesiones.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description:
                "Categoría del recuerdo: 'injury', 'preference', 'goal', 'limitation' u 'other'.",
            },
            content: {
              type: 'string',
              description:
                "Hecho concreto. Ejemplo: 'Le duele la rodilla al hacer sentadilla pesada'.",
            },
          },
          required: ['category', 'content'],
        },
      },
      {
        name: 'eliminar_recuerdo',
        description:
          'Elimina un recuerdo del usuario, por ejemplo, si reporta que ya se curó de una lesión.',
        inputSchema: {
          type: 'object',
          properties: {
            memory_id: { type: 'string', description: 'El ID UUID del recuerdo a eliminar.' },
          },
          required: ['memory_id'],
        },
      },
      {
        name: 'obtener_series_de_entrenamiento',
        description:
          'Obtiene el detalle (series, reps, peso) de una sesión de entrenamiento específica del usuario.',
        inputSchema: {
          type: 'object',
          properties: {
            workout_id: { type: 'string', description: 'UUID de la sesión' },
          },
          required: ['workout_id'],
        },
      },
      {
        name: 'crear_rutina',
        description:
          'Crea una nueva plantilla de rutina de entrenamiento para el usuario autenticado con sus ejercicios.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: "Nombre de la rutina (Ej. 'Empuje A - Hipertrofia')",
            },
            notes: { type: 'string', description: 'Notas o descripción opcional de la rutina' },
            exercises: {
              type: 'array',
              description: 'Lista de ejercicios ordenados que componen la rutina',
              items: {
                type: 'object',
                properties: {
                  exercise_id: {
                    type: 'string',
                    description: 'UUID del ejercicio obtenido con buscar_ejercicios',
                  },
                  order_index: {
                    type: 'number',
                    description: 'Posición en la rutina (0, 1, 2...)',
                  },
                },
                required: ['exercise_id'],
              },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'eliminar_rutina',
        description: 'Elimina permanentemente una rutina del usuario usando su UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            routine_id: { type: 'string', description: 'UUID de la rutina a eliminar' },
          },
          required: ['routine_id'],
        },
      },
      {
        name: 'buscar_ejercicios',
        description:
          'Busca ejercicios en el catálogo maestro de la app por término o grupo muscular.',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            muscle: { type: 'string' },
            limit: { type: 'number' },
          },
        },
      },
      {
        name: 'analizar_historial_feedback',
        description:
          'Obtiene el historial de feedback (dolor, técnica, intensidad) reportado por el usuario.',
        inputSchema: {
          type: 'object',
          properties: {
            exercise_id: {
              type: 'string',
              description: 'UUID del ejercicio a analizar (opcional)',
            },
            limit: { type: 'number', description: 'Número de reportes a traer. Default: 10' },
          },
        },
      },
      {
        name: 'obtener_entrenamiento_en_curso',
        description:
          'Obtiene la sesión de entrenamiento ACTIVA actual del usuario (incluyendo si proviene de una rutina).',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'analizar_volumen_muscular',
        description:
          'Calcula las series efectivas completadas y el tonelaje total por grupo muscular en los últimos días.',
        inputSchema: {
          type: 'object',
          properties: {
            days_ago: {
              type: 'number',
              description: 'Cantidad de días hacia atrás a analizar. Default: 7',
            },
          },
        },
      },
      {
        name: 'analizar_progresion_ejercicio',
        description:
          'Evalúa la progresión histórica (hasta 10 sesiones) en un ejercicio específico calculando 1RM y RIR.',
        inputSchema: {
          type: 'object',
          properties: {
            exercise_id: { type: 'string', description: 'UUID del ejercicio' },
          },
          required: ['exercise_id'],
        },
      },
      {
        name: 'crear_mesociclo_completo',
        description:
          'Genera un mesociclo completo con sus semanas, sesiones, e inyecta los objetivos (pesos/reps).',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nombre del mesociclo' },
            duration_weeks: { type: 'number', description: 'Duración en semanas' },
            weekly_sessions: {
              type: 'array',
              description:
                'Patrón semanal de entrenamiento que se repite cada semana del mesociclo.',
              items: {
                type: 'object',
                properties: {
                  day_number: {
                    type: 'number',
                    description: 'Día de la semana (1=lunes … 7=domingo). Único dentro del patrón.',
                  },
                  routine_id: {
                    type: 'string',
                    description: 'UUID real de una rutina del usuario (obtener_mis_rutinas).',
                  },
                  targets: {
                    type: 'array',
                    description: 'Objetivos por serie para esa sesión.',
                    items: {
                      type: 'object',
                      properties: {
                        exercise_id: { type: 'string', description: 'UUID del ejercicio' },
                        set_number: { type: 'number', description: 'Número de serie, desde 1' },
                        target_weight: { type: 'number', description: 'Peso objetivo en kg' },
                        target_reps: {
                          type: 'string',
                          description: 'Reps objetivo como TEXTO. Ej: "8-10" o "12".',
                        },
                        target_rir: { type: 'number', description: 'RIR objetivo' },
                      },
                      required: ['exercise_id', 'set_number'],
                    },
                  },
                },
                required: ['day_number', 'routine_id'],
              },
            },
            reemplazar_activo: {
              type: 'boolean',
              description:
                'Sólo true si el usuario confirmó explícitamente reemplazar su plan activo. Archiva el anterior como abandonado. Por defecto false.',
            },
          },
          required: ['name', 'duration_weeks', 'weekly_sessions'],
        },
      },
      {
        name: 'obtener_mesociclo_activo',
        description:
          'Obtiene el mesociclo (plan periodizado) ACTIVO del usuario con sus semanas, sesiones y objetivos. Devuelve null si no hay ninguno.',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    return await executeTool(authenticatedUserId, request.params.name, request.params.arguments);
  });

  return server;
}

// ============================================================================
// MAPA DE SESIONES AUTENTICADAS
// ============================================================================
const sessions = new Map<
  string,
  {
    server: Server;
    transport: WebStandardStreamableHTTPServerTransport;
    userId: string;
  }
>();

// ============================================================================
// SERVIDOR HTTP DUAL: JSON-RPC DIRECTO + MCP STREAMABLE
// ============================================================================
Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, mcp-session-id',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Expose-Headers': 'mcp-session-id',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // 🔒 1. AUTENTICACIÓN: Verificar JWT del usuario
    const authHeader = req.headers.get('Authorization');
    const user = await authenticateUser(authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'No autorizado. Se requiere un JWT válido en el header Authorization.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...cors } }
      );
    }

    // ⚡ 2. FAST-PATH: Manejo directo de JSON-RPC sin necesidad de handshake streamable
    const clonedReq = req.clone();
    try {
      const jsonBody = await clonedReq.json();
      if (jsonBody && jsonBody.method === 'tools/call' && jsonBody.params?.name) {
        const result = await executeTool(
          user.id,
          jsonBody.params.name,
          jsonBody.params.arguments || {}
        );
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: jsonBody.id ?? crypto.randomUUID(),
            result,
            content: result.content,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...cors } }
        );
      }
    } catch {
      // Si no es JSON estándar, dejamos que el transport streamable lo maneje
    }

    // 🌊 3. MCP STREAMABLE TRANSPORT (para clientes MCP formales)
    const sessionId = req.headers.get('mcp-session-id');
    let transport: WebStandardStreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId)!.transport;
    } else {
      const server = createSecureMcpServer(user.id);

      transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id: string) => {
          console.log(`[MCP Auth] Nueva sesión segura creada: ${user.id} (${id})`);
          sessions.set(id, { server, transport, userId: user.id });
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };

      await server.connect(transport);
    }

    const response = await transport.handleRequest(req);
    const newHeaders = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) newHeaders.set(k, v);

    return new Response(response.body, { status: response.status, headers: newHeaders });
  } catch (err) {
    console.error('[MCP Error]:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }
});
