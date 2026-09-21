import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { environment } from '../../../../environments/environment';

export interface McpToolCallResponse {
  content: Array<{ type: string; text: string }>;
}

/** Herramienta tal como la publica el servidor MCP en `tools/list`. */
export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

/**
 * El servidor responde a veces plano (`{ tools }`) y a veces envuelto en
 * `result` según pase por el transporte MCP o por el atajo JSON-RPC directo.
 */
export interface McpToolsListResponse {
  tools?: McpToolDefinition[];
  result?: { tools?: McpToolDefinition[] };
}

@Injectable({
  providedIn: 'root',
})
export class McpClientService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);

  // En local usa el servidor Edge Function de Supabase
  private mcpUrl = `${environment.supabase.url}/functions/v1/mcp-server`;

  /** Cabeceras autenticadas con el JWT del usuario actual. */
  private async buildHeaders(): Promise<HttpHeaders> {
    const session = await this.supabase.client.auth.getSession();
    const token = session.data.session?.access_token;

    return new HttpHeaders({
      'Content-Type': 'application/json',
      apikey: environment.supabase.anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  /**
   * Pide al servidor MCP la lista de herramientas que publica.
   *
   * Es la fuente de verdad del contrato: `GeminiService` declara sus tools
   * localmente por latencia, pero las contrasta contra esta lista para detectar
   * divergencias (una tool implementada en el servidor que el modelo no puede
   * ver, que es exactamente lo que ocurrió con `crear_mesociclo_completo`).
   */
  async listTools(): Promise<McpToolDefinition[]> {
    const headers = await this.buildHeaders();

    const body = {
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/list',
      params: {},
    };

    try {
      const response = await firstValueFrom(
        this.http.post<McpToolsListResponse>(this.mcpUrl, body, { headers }),
      );
      return response?.tools ?? response?.result?.tools ?? [];
    } catch (error) {
      console.error('[McpClientService] Error listando herramientas:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una herramienta MCP en la Edge Function pasando el token JWT del usuario actual
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<string> {
    const headers = await this.buildHeaders();

    const body = {
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post<McpToolCallResponse>(this.mcpUrl, body, { headers }),
      );
      return response?.content?.[0]?.text ?? '[]';
    } catch (error) {
      console.error(`[McpClientService] Error llamando a ${name}:`, error);
      throw error;
    }
  }
}
