export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  segments?: string[];
  interests?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export function validateRegister(body: unknown): { valid: true; data: RegisterInput } | { valid: false; message: string } {
  const { email, password, name, segments, interests } = (body || {}) as Record<string, unknown>;

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

  const validatedSegments = validateStringArray(segments, 10);
  const validatedInterests = validateStringArray(interests, 20);

  return {
    valid: true,
    data: {
      email: email.trim().toLowerCase(),
      password,
      name: trimmedName,
      segments: validatedSegments,
      interests: validatedInterests,
    },
  };
}

function validateStringArray(value: unknown, maxItems: number): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map(item => item.trim())
    .slice(0, maxItems);
}

export interface ProfileUpdateInput {
  name?: string;
  bio?: string | null;
  segments?: string[];
  interests?: string[];
  goals?: string[];
  content_preferences?: string[];
}

export function validateProfileUpdate(body: unknown): { valid: true; data: ProfileUpdateInput } | { valid: false; message: string } {
  const { name, bio, segments, interests, goals, content_preferences } =
    (body || {}) as Record<string, unknown>;

  const data: ProfileUpdateInput = {};
  let hasField = false;

  if (name !== undefined) {
    if (typeof name !== "string") {
      return { valid: false, message: "Nome inválido" };
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { valid: false, message: "Nome deve ter pelo menos 2 caracteres" };
    }
    if (trimmed.length > 100) {
      return { valid: false, message: "Nome deve ter no máximo 100 caracteres" };
    }
    data.name = trimmed;
    hasField = true;
  }
  if (bio !== undefined) {
    if (bio === null || bio === "") {
      data.bio = null;
    } else {
      if (typeof bio !== "string") {
        return { valid: false, message: "Bio inválida" };
      }
      const trimmed = bio.trim();
      if (trimmed.length > 280) {
        return { valid: false, message: "Bio deve ter no máximo 280 caracteres" };
      }
      data.bio = trimmed.length === 0 ? null : trimmed;
    }
    hasField = true;
  }
  if (segments !== undefined) {
    const arr = validateStringArray(segments, 10);
    if (arr.length === 0) {
      return { valid: false, message: "Selecione pelo menos um contexto de vida" };
    }
    data.segments = arr;
    hasField = true;
  }
  if (interests !== undefined) {
    data.interests = validateStringArray(interests, 20);
    hasField = true;
  }
  if (goals !== undefined) {
    data.goals = validateStringArray(goals, 10);
    hasField = true;
  }
  if (content_preferences !== undefined) {
    data.content_preferences = validateStringArray(content_preferences, 10);
    hasField = true;
  }

  if (!hasField) {
    return { valid: false, message: "Pelo menos um campo deve ser fornecido" };
  }

  return { valid: true, data };
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
