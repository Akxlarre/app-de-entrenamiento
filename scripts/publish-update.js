const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usar Service Role para bypass RLS insert
const apkPath = process.env.APK_PATH;
const versionTag = process.env.VERSION_TAG || 'v1.0.0';
const releaseNotes = process.env.RELEASE_NOTES || 'Nueva actualización disponible.';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan las credenciales de Supabase (SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

if (!apkPath || !fs.existsSync(apkPath)) {
  console.error(`Error: No se encontró el archivo APK en la ruta: ${apkPath}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function publishUpdate() {
  try {
    console.log(`Iniciando publicación de la versión ${versionTag}...`);

    // 1. Obtener el último build_number
    const { data: latestUpdate, error: fetchError } = await supabase
      .from('app_updates')
      .select('build_number')
      .order('build_number', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Error al consultar último build: ${fetchError.message}`);
    }

    const nextBuildNumber = (latestUpdate?.build_number || 0) + 1;
    console.log(`Nuevo build number asignado: ${nextBuildNumber}`);

    // 2. Subir el APK al Storage
    const fileName = `update-${versionTag}-b${nextBuildNumber}.apk`;
    const fileBuffer = fs.readFileSync(apkPath);
    
    console.log(`Subiendo ${fileName} al bucket 'releases'...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('releases')
      .upload(fileName, fileBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Error al subir el APK: ${uploadError.message}`);
    }
    
    console.log('APK subido con éxito:', uploadData.path);

    // 3. Registrar la actualización en la base de datos
    console.log('Registrando actualización en app_updates...');
    const { error: insertError } = await supabase
      .from('app_updates')
      .insert({
        version: versionTag.replace('refs/tags/', ''), // Limpiar si viene directo de github ref
        build_number: nextBuildNumber,
        release_notes: releaseNotes,
        force_update: false, // Por defecto falso, se puede cambiar manual si es crítico
        apk_path: uploadData.path
      });

    if (insertError) {
      throw new Error(`Error al registrar en BD: ${insertError.message}`);
    }

    console.log(`¡Publicación completada exitosamente! La actualización ${versionTag} (build ${nextBuildNumber}) ya está disponible para los usuarios.`);
    
  } catch (err) {
    console.error('Falló la publicación:', err);
    process.exit(1);
  }
}

publishUpdate();
