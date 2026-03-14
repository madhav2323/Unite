import { randomUUID } from "crypto";

export interface Version {
  id: string;
  username: string;
  code: string;
  language: string;
  timestamp: Date;
  label?: string;
}

const versions: Version[] = [];

export function getAllVersions(): Version[] {
  return [...versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function saveVersion(
  username: string,
  code: string,
  language: string,
  label?: string
): Version {
  const version: Version = {
    id: randomUUID(),
    username,
    code,
    language,
    timestamp: new Date(),
    label,
  };
  versions.push(version);
  return version;
}

export function getVersionById(id: string): Version | undefined {
  return versions.find((v) => v.id === id);
}
