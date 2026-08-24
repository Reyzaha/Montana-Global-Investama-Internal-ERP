export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDisplayDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return "-";
  try {
    const date = new Date(dateTimeStr);
    return (
      date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  } catch {
    return dateTimeStr;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function isCheckInLate(
  checkInTimeStr: string,
  scheduleTimeStr: string,
  lateThresholdMinutes: number = 15,
): boolean {
  try {
    const [inHours, inMins] = checkInTimeStr.split(":").map(Number);
    const [schedHours, schedMins] = scheduleTimeStr.split(":").map(Number);

    const inTotalMinutes = inHours * 60 + inMins;
    const schedTotalMinutes = schedHours * 60 + schedMins;

    return inTotalMinutes > schedTotalMinutes + lateThresholdMinutes;
  } catch {
    return false;
  }
}
