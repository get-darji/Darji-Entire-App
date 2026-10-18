type AvatarUser = {
  avatarPreset?: string;
  dateOfBirth?: string;
  gender?: string;
  name?: string;
  phone?: string;
  role?: string;
};

const avatarPresetFiles: Record<string, string> = {
  boy: "boy.png",
  girl: "girl.png",
  youngMale: "young male.png",
  youngFemale: "young female.png",
  uncle: "uncle.png",
  aunt: "aunt.png",
  aunt2: "aunt_2.png",
  blackMale: "black_male.png",
  blackFemale: "black_female.png",
  oldMale: "old_male.png",
  tannedMale: "tanned_male.png",
  tannedMale2: "tanned_male_2.png",
  tannedUncle: "tanned_uncle.png"
};

export function normalizedAvatarGender(gender?: string) {
  const value = gender?.trim().toLowerCase();
  if (!value) return undefined;
  if (["male", "man", "men", "boy"].includes(value)) return "boy";
  if (["female", "woman", "women", "girl"].includes(value)) return "girl";
  return undefined;
}

export function avatarPresetUrl(preset?: string) {
  const file = preset ? avatarPresetFiles[preset] : undefined;
  return file ? `/avatars/${encodeURIComponent(file)}` : undefined;
}

// Mirrors TailorProfileScreen and DeliveryProfileScreen exactly.
export function getDefaultAvatarUrl(seed: string, gender?: string) {
  const selectedGender = normalizedAvatarGender(gender);
  const avatarPresets = selectedGender === "boy"
    ? ["boy", "youngMale", "blackMale", "tannedMale", "uncle", "oldMale"]
    : selectedGender === "girl"
      ? ["girl", "youngFemale", "blackFemale", "aunt", "aunt2"]
      : ["boy", "girl", "youngMale", "youngFemale", "uncle", "aunt", "blackMale", "blackFemale", "oldMale", "tannedMale", "tannedMale2", "tannedUncle", "aunt2"];
  const value = Array.from(seed || "User").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return avatarPresetUrl(avatarPresets[value % avatarPresets.length])!;
}

function customerAvatarHash(seed?: string) {
  const value = seed || "User";
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = value.charCodeAt(index) + ((hash << 5) - hash);
  return Math.abs(hash);
}

// Mirrors the customer app's selected/default avatar behavior.
export function getCustomerFallbackAvatarUrl(user?: AvatarUser | null) {
  const selectedPreset = avatarPresetUrl(user?.avatarPreset);
  if (selectedPreset) return selectedPreset;
  const gender = normalizedAvatarGender(user?.gender);
  const isBoy = gender ? gender === "boy" : customerAvatarHash(user?.name) % 2 === 0;
  const dateOfBirth = user?.dateOfBirth ? new Date(user.dateOfBirth) : null;
  let age: number | undefined;
  if (dateOfBirth && !Number.isNaN(dateOfBirth.getTime())) {
    const now = new Date();
    age = now.getFullYear() - dateOfBirth.getFullYear();
    const birthdayPassed = now.getMonth() > dateOfBirth.getMonth() || (now.getMonth() === dateOfBirth.getMonth() && now.getDate() >= dateOfBirth.getDate());
    if (!birthdayPassed) age -= 1;
  }
  if (typeof age === "number" && age >= 0 && age < 13) return avatarPresetUrl(isBoy ? "boy" : "girl")!;
  if (typeof age === "number" && age >= 45 && age < 130) return avatarPresetUrl(isBoy ? "uncle" : "aunt")!;
  return avatarPresetUrl(isBoy ? "youngMale" : "youngFemale")!;
}

export function getUserFallbackAvatarUrl(user?: AvatarUser | null) {
  if (String(user?.role ?? "").toUpperCase() === "CUSTOMER") return getCustomerFallbackAvatarUrl(user);
  return getDefaultAvatarUrl(user?.name ?? user?.phone ?? "User", user?.gender);
}
