export function nameFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export async function uploadFiles(
  files: File[],
  folder: "sponsors" | "gallery",
): Promise<{ name: string; url: string }[]> {
  const formData = new FormData();
  formData.append("folder", folder);
  files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Upload failed");
  }

  const data = (await response.json()) as { files: { name: string; url: string }[] };
  return data.files;
}
