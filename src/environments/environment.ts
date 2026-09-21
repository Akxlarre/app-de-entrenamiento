export const environment = {
  production: false,
  // Sin geminiApiKey a propósito: Gemini se consume a través de la Edge
  // Function `gemini-proxy`, que guarda la clave del lado del servidor.
  supabase: {
    url: 'http://localhost:54351',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  },
};
