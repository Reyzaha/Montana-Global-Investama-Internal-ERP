"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Compass,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Attendance, AttendanceLocation, WorkSchedule } from "../../types/attendance.types";
import { mockAttendanceRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import {
  getCurrentGpsPosition,
  validateAttendanceLocation,
} from "../../utils/geolocation";
import { formatDisplayDate, getTodayDateString } from "../../utils/date";

export function UserAttendanceWidget({ onAttendanceUpdated }: { onAttendanceUpdated?: () => void }) {
  const { currentUser, storeVersion } = useHrContext();

  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Geolocation state
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<{
    isValid: boolean;
    locationName?: string;
    distanceMeters?: number;
    allowedRadius?: number;
    error?: string;
  } | null>(null);

  // Load data
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      mockAttendanceRepository.getTodayAttendance(currentUser.id),
      mockAttendanceRepository.getWorkSchedule(),
      mockAttendanceRepository.getAttendanceLocations(),
    ])
      .then(([todayAtt, sched, locs]) => {
        if (isMounted) {
          setAttendance(todayAtt);
          setSchedule(sched);
          setLocations(locs);
        }
      })
      .catch((err) => console.error("Failed to load attendance widget data:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, storeVersion]);

  // Detect GPS Location
  const handleDetectLocation = async (presetCoords?: { latitude: number; longitude: number }) => {
    setDetectingGps(true);
    setLocationStatus(null);
    try {
      let coords = presetCoords;
      if (!coords) {
        coords = await getCurrentGpsPosition();
      }
      setGpsCoords(coords);

      const validation = validateAttendanceLocation(coords.latitude, coords.longitude, locations);
      if (validation.isValid && validation.location) {
        setLocationStatus({
          isValid: true,
          locationName: validation.location.name,
          distanceMeters: validation.distanceMeters,
          allowedRadius: validation.location.radiusMeters,
        });
      } else {
        setLocationStatus({
          isValid: false,
          locationName: validation.location?.name,
          distanceMeters: validation.distanceMeters,
          allowedRadius: validation.location?.radiusMeters,
          error: validation.errorMessage,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to detect location.";
      setLocationStatus({
        isValid: false,
        error: errorMsg,
      });
    } finally {
      setDetectingGps(false);
    }
  };

  // Perform Check In
  const handleCheckIn = async () => {
    if (!gpsCoords || !locationStatus?.isValid) {
      await handleDetectLocation();
      return;
    }

    setActionLoading(true);
    try {
      const result = await mockAttendanceRepository.checkIn({
        employeeId: currentUser.id,
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
      });
      setAttendance(result);
      onAttendanceUpdated?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Check Out
  const handleCheckOut = async () => {
    if (!gpsCoords || !locationStatus?.isValid) {
      await handleDetectLocation();
      return;
    }

    setActionLoading(true);
    try {
      const result = await mockAttendanceRepository.checkOut({
        employeeId: currentUser.id,
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
      });
      setAttendance(result);
      onAttendanceUpdated?.();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const todayStr = formatDisplayDate(getTodayDateString());

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Today&apos;s Attendance</CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Calendar className="size-3.5" />
                {todayStr}
              </CardDescription>
            </div>
          </div>

          <div>
            {attendance?.status === "COMPLETED" ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Completed
              </Badge>
            ) : attendance?.status === "CHECKED_IN" ? (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 animate-pulse">
                Checked In
              </Badge>
            ) : attendance?.status === "LATE" ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                Late Check-In
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                Not Checked In
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 pt-4">
        {/* Schedule & Timing Info */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Work Schedule</span>
            <p className="font-medium text-foreground">
              {schedule ? `${schedule.checkInTime} - ${schedule.checkOutTime}` : "08:00 - 17:00"}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Office Location</span>
            <p className="font-medium text-foreground flex items-center gap-1 truncate">
              <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
              {locations[0]?.name || "Head Office"}
            </p>
          </div>
        </div>

        {/* Attendance Progress Status */}
        <div className="grid grid-cols-2 gap-3 border-y py-3">
          <div>
            <span className="text-xs text-muted-foreground">Check In</span>
            <p className="text-base font-semibold text-foreground">
              {attendance?.checkInAt ? attendance.checkInAt : "--:--"}
            </p>
            {attendance?.checkInDistance !== null && attendance?.checkInDistance !== undefined && (
              <span className="text-[11px] text-muted-foreground">
                Distance: {attendance.checkInDistance}m
              </span>
            )}
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Check Out</span>
            <p className="text-base font-semibold text-foreground">
              {attendance?.checkOutAt ? attendance.checkOutAt : "--:--"}
            </p>
            {attendance?.checkOutDistance !== null && attendance?.checkOutDistance !== undefined && (
              <span className="text-[11px] text-muted-foreground">
                Distance: {attendance.checkOutDistance}m
              </span>
            )}
          </div>
        </div>

        {/* Location Detection Area */}
        <div className="rounded-lg border p-3 bg-background">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Compass className="size-3.5 text-primary" />
              GPS Location Status
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-primary"
              disabled={detectingGps}
              onClick={() => handleDetectLocation()}
            >
              <Navigation className={`mr-1 size-3.5 ${detectingGps ? "animate-spin" : ""}`} />
              {detectingGps ? "Detecting..." : gpsCoords ? "Refresh GPS" : "Detect Location"}
            </Button>
          </div>

          {locationStatus ? (
            locationStatus.isValid ? (
              <div className="flex items-start gap-2 rounded bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Within Attendance Area</p>
                  <p className="mt-0.5 text-emerald-600 dark:text-emerald-300">
                    Location detected: <strong>{locationStatus.locationName}</strong> • Distance:{" "}
                    <strong>{locationStatus.distanceMeters}m</strong> (Radius: {locationStatus.allowedRadius}m)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Outside Attendance Radius</p>
                  <p className="mt-0.5">
                    {locationStatus.error ||
                      `Distance: ${(locationStatus.distanceMeters ?? 0) >= 1000 ? `${((locationStatus.distanceMeters ?? 0) / 1000).toFixed(2)} km` : `${locationStatus.distanceMeters} m`} from allowed radius (${locationStatus.allowedRadius} m).`}
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground py-1">
              <span>Location not verified yet.</span>
              {locations[0] && (
                <button
                  type="button"
                  onClick={() =>
                    handleDetectLocation({
                      latitude: locations[0].latitude + 0.0001,
                      longitude: locations[0].longitude + 0.0001,
                    })
                  }
                  className="text-[11px] text-primary hover:underline"
                >
                  (Dev: Sim Office GPS)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        {attendance?.status === "COMPLETED" ? (
          <Button disabled className="w-full bg-muted text-muted-foreground">
            <CheckCircle2 className="mr-2 size-4 text-emerald-500" />
            Attendance Completed Today
          </Button>
        ) : attendance?.status === "CHECKED_IN" || attendance?.status === "LATE" ? (
          <Button
            onClick={handleCheckOut}
            disabled={actionLoading || detectingGps}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            <Clock className="mr-2 size-4" />
            {actionLoading ? "Recording Check-Out..." : "Check Out"}
          </Button>
        ) : (
          <Button
            onClick={handleCheckIn}
            disabled={actionLoading || detectingGps}
            className="w-full font-medium"
          >
            <MapPin className="mr-2 size-4" />
            {actionLoading ? "Recording Check-In..." : "Check In"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
