import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { environment } from '../../../../environments/environment';

export interface McpToolCallResponse {
  content: Array<{ type: string; text: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class McpClientService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);

  // En local usa el servidor Edge Function de Supabase
  private mcpUrl = `${environment.supabase.url}/functions/v1/mcp-server`;

  /**
   * Ejecuta una herramienta MCP en la Edge Function pasando el token JWT del usuario actual
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<string> {
    const session = await this.supabase.client.auth.getSession();
    const token = session.data.session?.access_token;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      apikey: environment.supabase.anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

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
        this.http.post<McpToolCallResponse>(this.mcpUrl, body, { headers })
      );
      return response?.content?.[0]?.text ?? '[]';
    } catch (error) {
      console.error(`[McpClientService] Error llamando a ${name}:`, error);
      throw error;
    }
  }
}
