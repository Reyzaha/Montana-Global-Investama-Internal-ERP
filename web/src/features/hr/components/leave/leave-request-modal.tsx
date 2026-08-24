"use client";

import { FileText, Upload, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LeaveType, LEAVE_TYPE_LABELS } from "../../types/leave.types";
import { mockLeaveRepository } from "../../mocks/hr-store";
import { useHrContext } from "../../context/hr-context";
import { getTodayDateString } from "../../utils/date";

export function LeaveRequestModal({
  trigger,
  onRequestCreated,
}: {
  trigger?: React.ReactNode;
  onRequestCreated?: () => void;
}) {
  const { currentUser } = useHrContext();
  const [open, setOpen] = useState(false);

  const [leaveType, setLeaveType] = useState<LeaveType>("PERMISSION");
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [description, setDescription] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Please describe the reason for your leave request.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    setSubmitting(true);
    try {
      await mockLeaveRepository.createLeaveRequest({
        employeeId: currentUser.id,
        type: leaveType,
        startDate,
        endDate,
        description: description.trim(),
        attachmentName: attachmentName.trim() || undefined,
      });
      setOpen(false);
      setDescription("");
      setAttachmentName("");
      onRequestCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="font-medium">
            <FileText className="mr-1.5 size-4" />
            Request Permission
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Request Permission / Leave</DialogTitle>
          <DialogDescription className="text-xs">
            Submit a formal leave or permission request to HR for review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Leave Type Selector: Sakit, Cuti, Izin */}
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-foreground">Jenis Izin *</label>
            <div className="grid grid-cols-3 gap-2">
              {(["SICK", "ANNUAL_LEAVE", "PERMISSION"] as LeaveType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLeaveType(type)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-medium transition-all ${
                    leaveType === type
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span>{LEAVE_TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Tanggal Mulai *</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Tanggal Selesai *</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <label className="text-xs font-medium">Deskripsi Alasan *</label>
            <Textarea
              placeholder="Jelaskan keperluan izin atau alasan cuti/sakit secara detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Attachment (Optional) */}
          <div className="grid gap-1.5">
            <label className="text-xs font-medium">Dokumen Pendukung / Surat Dokter (Optional)</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Surat-Keterangan-Dokter.pdf"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs px-2.5"
                onClick={() => setAttachmentName(`Lampiran-Izin-${Date.now().toString().slice(-4)}.pdf`)}
              >
                <Upload className="size-3.5 mr-1" />
                Simulate
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-destructive/10 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
