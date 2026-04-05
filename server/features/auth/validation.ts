export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateRegister(body: unknown): { valid: true; data: RegisterInput } | { valid: false; message: string } {
  const { email, password, name } = (body || {}) as Record<string, unknown>;

  if (!email || typeof email !== "string") {
    return { valid: false, message: "Email é obrigatório" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: "Formato de email inválido" };
  }

  if (!password || typeof password !== "string") {
    return { valid: false, message: "Senha é obrigatória" };
  }

  if (password.length < 8) {
    return { valid: false, message: "Senha deve ter pelo menos 8 caracteres" };
  }

  if (password.length > 128) {
    return { valid: false, message: "Senha deve ter no máximo 128 caracteres" };
  }

  if (!name || typeof name !== "string") {
    return { valid: false, message: "Nome é obrigatório" };
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return { valid: false, message: "Nome deve ter pelo menos 2 caracteres" };
  }

  if (trimmedName.length > 100) {
    return { valid: false, message: "Nome deve ter no máximo 100 caracteres" };
  }

  return {
    valid: true,
    data: {
      email: email.trim().toLowerCase(),
      password,
      name: trimmedName,
    },
  };
}

export function validateLogin(body: unknown): { valid: true; data: LoginInput } | { valid: false; message: string } {
  const { email, password } = (body || {}) as Record<string, unknown>;

  if (!email || typeof email !== "string") {
    return { valid: false, message: "Email é obrigatório" };
  }

  if (!password || typeof password !== "string") {
    return { valid: false, message: "Senha é obrigatória" };
  }

  return {
    valid: true,
    data: {
      email: email.trim().toLowerCase(),
      password,
    },
  };
}
