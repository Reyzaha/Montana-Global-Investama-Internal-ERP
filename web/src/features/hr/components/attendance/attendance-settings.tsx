"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  MapPin,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MAX_ATTENDANCE_RADIUS,
  MIN_ATTENDANCE_RADIUS,
} from "../../constants/attendance.constants";
import { AttendanceLocation, WorkSchedule } from "../../types/attendance.types";
import { mockAttendanceRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";

export function AttendanceSettings() {
  const { storeVersion } = useHrContext();

  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New location form state
  const [newLocName, setNewLocName] = useState("");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [newLocLat, setNewLocLat] = useState<number>(-6.2255);
  const [newLocLon, setNewLocLon] = useState<number>(106.8095);
  const [newLocRadius, setNewLocRadius] = useState<number>(100);
  const [locError, setLocError] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      mockAttendanceRepository.getWorkSchedule(),
      mockAttendanceRepository.getAttendanceLocations(),
    ])
      .then(([sched, locs]) => {
        if (isMounted) {
          setSchedule(sched);
          setLocations(locs);
        }
      })
      .catch((err) => console.error("Failed to load settings:", err));

    return () => {
      isMounted = false;
    };
  }, [storeVersion]);

  // Save Schedule
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedule) return;

    setSavingSchedule(true);
    setScheduleMessage(null);
    try {
      await mockAttendanceRepository.updateWorkSchedule(schedule);
      setScheduleMessage({ text: "Work schedule updated successfully.", type: "success" });
    } catch (err: unknown) {
      setScheduleMessage({
        text: err instanceof Error ? err.message : "Failed to update schedule.",
        type: "error",
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Toggle Day
  const handleToggleDay = (day: number) => {
    if (!schedule) return;
    const days = schedule.days.includes(day)
      ? schedule.days.filter((d) => d !== day)
      : [...schedule.days, day].sort();
    setSchedule({ ...schedule, days });
  };

  // Add/Save Location with Strict Radius Safety Limit
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocError("");

    if (!newLocName.trim()) {
      setLocError("Location name is required.");
      return;
    }

    if (newLocRadius < MIN_ATTENDANCE_RADIUS || newLocRadius > MAX_ATTENDANCE_RADIUS) {
      setLocError(
        `Radius must be between ${MIN_ATTENDANCE_RADIUS} and ${MAX_ATTENDANCE_RADIUS} meters.`,
      );
      return;
    }

    setSavingLoc(true);
    try {
      const added = await mockAttendanceRepository.saveAttendanceLocation({
        name: newLocName.trim(),
        address: newLocAddress.trim(),
        latitude: Number(newLocLat),
        longitude: Number(newLocLon),
        radiusMeters: Number(newLocRadius),
        isActive: true,
      });
      setLocations([...locations, added]);
      setNewLocName("");
      setNewLocAddress("");
      setNewLocRadius(100);
    } catch (err: unknown) {
      setLocError(err instanceof Error ? err.message : "Failed to save location.");
    } finally {
      setSavingLoc(false);
    }
  };

  // Toggle Location Active
  const handleToggleLocationActive = async (loc: AttendanceLocation) => {
    try {
      const updated = await mockAttendanceRepository.saveAttendanceLocation({
        ...loc,
        isActive: !loc.isActive,
      });
      setLocations(locations.map((l) => (l.id === loc.id ? updated : l)));
    } catch (err) {
      console.error("Failed to toggle location:", err);
    }
  };

  // Delete Location
  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Are you sure you want to remove this attendance location?")) return;
    try {
      await mockAttendanceRepository.deleteAttendanceLocation(id);
      setLocations(locations.filter((l) => l.id !== id));
    } catch (err) {
      console.error("Failed to delete location:", err);
    }
  };

  const dayLabels = [
    { day: 1, label: "Mon" },
    { day: 2, label: "Tue" },
    { day: 3, label: "Wed" },
    { day: 4, label: "Thu" },
    { day: 5, label: "Fri" },
    { day: 6, label: "Sat" },
    { day: 7, label: "Sun" },
  ];

  return (
    <div className="grid gap-6">
      {/* Work Schedule Configuration */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Work Schedule Settings</CardTitle>
              <CardDescription className="text-xs">
                Configure corporate operational working hours, work days, and late thresholds.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {schedule && (
            <form onSubmit={handleSaveSchedule} className="grid gap-4 max-w-2xl">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Schedule Name</label>
                <Input
                  value={schedule.name}
                  onChange={(e) => setSchedule({ ...schedule, name: e.target.value })}
                  placeholder="e.g. Office Standard"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Active Work Days</label>
                <div className="flex flex-wrap gap-2">
                  {dayLabels.map(({ day, label }) => {
                    const isSelected = schedule.days.includes(day);
                    return (
                      <Button
                        key={day}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleDay(day)}
                        className="h-8 px-3 text-xs"
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Check-In Time</label>
                  <Input
                    type="time"
                    value={schedule.checkInTime}
                    onChange={(e) => setSchedule({ ...schedule, checkInTime: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Check-Out Time</label>
                  <Input
                    type="time"
                    value={schedule.checkOutTime}
                    onChange={(e) => setSchedule({ ...schedule, checkOutTime: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Late Threshold (Mins)</label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={schedule.lateThresholdMinutes}
                    onChange={(e) =>
                      setSchedule({ ...schedule, lateThresholdMinutes: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              {scheduleMessage && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                    scheduleMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {scheduleMessage.type === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0" />
                  )}
                  <span>{scheduleMessage.text}</span>
                </div>
              )}

              <Button type="submit" disabled={savingSchedule} className="w-fit">
                <Save className="mr-2 size-4" />
                {savingSchedule ? "Saving Schedule..." : "Save Work Schedule"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Attendance Locations & Radius Safety Bounds */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Attendance Locations & Geofence</CardTitle>
                <CardDescription className="text-xs">
                  Define authorized office sites, GPS coordinates, and enforced radius boundaries.
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <ShieldAlert className="size-3.5 text-primary" />
              Radius Safety: {MIN_ATTENDANCE_RADIUS}m – {MAX_ATTENDANCE_RADIUS}m
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6">
          {/* Active Locations List */}
          <div className="grid gap-3">
            <h4 className="text-sm font-semibold text-foreground">Configured Locations ({locations.length})</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className={`flex flex-col justify-between rounded-lg border p-4 transition-colors ${
                    loc.isActive ? "bg-card border-border" : "bg-muted/30 opacity-70"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building className="size-4 text-primary shrink-0" />
                        <h5 className="font-semibold text-sm">{loc.name}</h5>
                      </div>
                      <Badge
                        variant={loc.isActive ? "default" : "secondary"}
                        className="text-[10px] cursor-pointer"
                        onClick={() => handleToggleLocationActive(loc)}
                      >
                        {loc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {loc.address && (
                      <p className="mt-1 text-xs text-muted-foreground">{loc.address}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                      <div>
                        <span className="font-medium text-foreground">Lat:</span> {loc.latitude.toFixed(4)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Lon:</span> {loc.longitude.toFixed(4)}
                      </div>
                      <div>
                        <span className="font-medium text-primary font-semibold">Radius:</span> {loc.radiusMeters}m
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleLocationActive(loc)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      {loc.isActive ? "Deactivate" : "Activate"}
                    </button>
                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="text-destructive hover:text-destructive/80 flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Add New Location Form */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Add New Attendance Location
            </h4>

            <form onSubmit={handleAddLocation} className="grid gap-4 max-w-2xl bg-muted/10 border p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Location Name *</label>
                  <Input
                    placeholder="e.g. Branch Office Surabaya"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium">Address / Description</label>
                  <Input
                    placeholder="e.g. Jl. Pemuda No. 45"
                    value={newLocAddress}
                    onChange={(e) => setNewLocAddress(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Latitude *</label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newLocLat}
                    onChange={(e) => setNewLocLat(Number(e.target.value))}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium">Longitude *</label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newLocLon}
                    onChange={(e) => setNewLocLon(Number(e.target.value))}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium flex items-center justify-between">
                    Radius (Meters) *
                    <span className="text-[10px] text-muted-foreground">50m - 1000m</span>
                  </label>
                  <Input
                    type="number"
                    min={MIN_ATTENDANCE_RADIUS}
                    max={MAX_ATTENDANCE_RADIUS}
                    value={newLocRadius}
                    onChange={(e) => setNewLocRadius(Number(e.target.value))}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground text-[11px]">Quick Location Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewLocName("Head Office (SCBD Jakarta)");
                    setNewLocAddress("SCBD Lot 28, Jakarta");
                    setNewLocLat(-6.2255);
                    setNewLocLon(106.8095);
                    setNewLocRadius(100);
                  }}
                  className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/80"
                >
                  Jakarta SCBD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewLocName("Branch Office Balikpapan");
                    setNewLocAddress("Jl. Jenderal Sudirman No. 88, Kaltim");
                    setNewLocLat(-1.2654);
                    setNewLocLon(116.8312);
                    setNewLocRadius(150);
                  }}
                  className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/80"
                >
                  Balikpapan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewLocName("Mining Site Samarinda");
                    setNewLocAddress("Sangatta Area Block B, Kaltim");
                    setNewLocLat(-0.5022);
                    setNewLocLon(117.1537);
                    setNewLocRadius(300);
                  }}
                  className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/80"
                >
                  Samarinda Site
                </button>
              </div>

              {locError && (
                <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{locError}</span>
                </div>
              )}

              <Button type="submit" disabled={savingLoc} className="w-fit" size="sm">
                <Plus className="mr-1.5 size-4" />
                {savingLoc ? "Saving Location..." : "Add Attendance Location"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
