/**
 * Retorna a URL correta para redirecionamento baseada no ambiente
 */
export const getAuthRedirectUrl = (path: string = '') => {
  // Em produção, usar sempre o domínio da aplicação
  const baseUrl = window.location.origin;
  
  // Se estivermos em localhost, mas quisermos forçar produção para emails
  // podemos configurar uma URL específica aqui
  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  
  if (isLocalhost) {
    // Para desenvolvimento local, manter localhost
    return `${baseUrl}${path}`;
  }
  
  // Para produção, usar o domínio atual
  return `${baseUrl}${path}`;
};

/**
 * Configurações de reset de senha para diferentes ambientes
 */
export const getResetPasswordConfig = () => {
  const redirectTo = getAuthRedirectUrl('/reset-password');
  
  return {
    redirectTo,
    // Outras configurações podem ser adicionadas aqui se necessário
  };
};