"use client"

import * as React from "react"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
} from "lucide-react"
import { LegalDocument } from "../types/document.types"
import { StatusBadge } from "@/components/shared/status-badge"
import { getStatusConfig } from "../types/status-helper"

export function DocumentPreviewModal({
  document: doc,
  open,
  onOpenChange,
}: {
  document: LegalDocument
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [zoom, setZoom] = React.useState(100)
  const [currentPage, setCurrentPage] = React.useState(1)
  const totalPages = 4
  const statusCfg = getStatusConfig(doc.status)

  const activeVersion =
    doc.versions.find((v) => v.version === doc.currentVersion) ??
    doc.versions[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-5xl h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40 shrink-0">
          <div className="flex items-center gap-3">
            <FileCheck2 className="size-5 text-primary" />
            <div>
              <DialogTitle className="text-sm font-semibold truncate max-w-md">
                {activeVersion.fileName}
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Version {doc.currentVersion}.0</span>
                <span>&bull;</span>
                <span className="font-mono">{doc.documentNumber}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-8">
            <StatusBadge
              variant={statusCfg.variant}
              label={statusCfg.label}
              size="sm"
            />
            <Button
              variant="outline"
              size="xs"
              className="gap-1 cursor-pointer"
              onClick={() => {
                alert(`Downloading ${activeVersion.fileName}... (Simulated)`)
              }}
            >
              <Download className="size-3" />
              <span>Download</span>
            </Button>
          </div>
        </div>

        {/* Viewer Toolbar */}
        <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={zoom <= 75}
              onClick={() => setZoom((z) => Math.max(75, z - 15))}
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <span className="w-12 text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={zoom >= 150}
              onClick={() => setZoom((z) => Math.min(150, z + 15))}
            >
              <ZoomIn className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Document Content Canvas */}
        <div className="flex-1 overflow-auto bg-zinc-800/20 p-6 flex justify-center items-start">
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className="w-[680px] min-h-[850px] bg-card text-card-foreground shadow-2xl border rounded-md p-10 relative transition-transform duration-100 flex flex-col justify-between"
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-5">
              <span className="text-7xl font-extrabold uppercase -rotate-30 tracking-widest text-foreground">
                {doc.status === "APPROVED"
                  ? "APPROVED & EXECUTED"
                  : doc.status === "REJECTED"
                  ? "REJECTED"
                  : "CONFIDENTIAL"}
              </span>
            </div>

            {/* Simulated Document Body */}
            <div>
              {/* Header Letterhead */}
              <div className="border-b-2 border-primary/40 pb-4 mb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-sm font-black tracking-widest uppercase text-primary">
                    PT MONTANA GLOBAL INVESTAMA
                  </h1>
                  <p className="text-[10px] text-muted-foreground">
                    Corporate Legal & Investment Directorate
                  </p>
                </div>
                <div className="text-right text-[10px] text-muted-foreground font-mono">
                  <div>REF: {doc.documentNumber}</div>
                  <div>DATE: {doc.createdAt.split(" ")[0]}</div>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center my-6">
                <h2 className="text-base font-bold text-foreground underline uppercase tracking-tight">
                  {doc.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Related Project: {doc.project}
                </p>
              </div>

              {/* Body Text Clauses */}
              {currentPage === 1 && (
                <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
                  <p className="indent-4">
                    Pada hari ini, disepakati dan ditandatangani Perjanjian Kerja Sama antara <strong>PT Montana Global Investama</strong>, berkedudukan hukum di Jakarta (&ldquo;Pihak Pertama&rdquo;), dengan mitra terkait (&ldquo;Pihak Kedua&rdquo;).
                  </p>

                  <div className="space-y-2">
                    <h3 className="font-bold text-xs">PASAL 1 — MAKSUD DAN TUJUAN</h3>
                    <p className="text-[11px] text-muted-foreground">
                      1.1. Perjanjian ini mengatur mengenai pelaksanaan kewajiban dan hak para pihak terkait {doc.description || doc.title}.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      1.2. Seluruh kegiatan operasional tunduk pada peraturan perundang-undangan Republik Indonesia dan standar K3LH industri pertambangan.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="font-bold text-xs">PASAL 2 — RUANG LINGKUP PEKERJAAN & TANGGUNG JAWAB</h3>
                    <p className="text-[11px] text-muted-foreground">
                      2.1. Pihak Pertama berkewajiban menyediakan akses dan koordinasi site sesuai jadwal yang disetujui.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      2.2. Pihak Kedua menjamin ketersediaan unit dan tenaga ahli yang tersertifikasi secara penuh.
                    </p>
                  </div>
                </div>
              )}

              {currentPage === 2 && (
                <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs">PASAL 3 — NILAI KONTRAK DAN TATA CARA PEMBAYARAN</h3>
                    <p className="text-[11px] text-muted-foreground">
                      3.1. Pembayaran dilaksanakan secara termin bertahap sesuai Berita Acara Serah Terima (BAST) yang diverifikasi oleh tim Project & Finance Montana.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      3.2. Pajak-pajak yang timbul atas transaksi ini dipotong dan disetorkan sesuai ketentuan perpajakan yang berlaku (PPh Pasal 23/21 dan PPN).
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="font-bold text-xs">PASAL 4 — JAMINAN & LAYANAN PURNA JUAL (SLA)</h3>
                    <p className="text-[11px] text-muted-foreground">
                      4.1. Jaminan performa ketersediaan unit (Physical Availability) minimal 90% per bulan operasional.
                    </p>
                  </div>
                </div>
              )}

              {currentPage === 3 && (
                <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs">PASAL 5 — KERAHASIAAN & GANTI RUGI</h3>
                    <p className="text-[11px] text-muted-foreground">
                      5.1. Para pihak wajib menjaga kerahasiaan informasi teknis, finansial, dan komersial selama 3 (tiga) tahun setelah berakhirnya masa perjanjian.
                    </p>
                    {doc.revisionReason && (
                      <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px]">
                        <strong>Catatan Revisi Legal:</strong> &ldquo;{doc.revisionReason}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentPage === 4 && (
                <div className="space-y-6 text-xs leading-relaxed text-foreground/90 pt-4">
                  <p>
                    Demikian Perjanjian ini dibuat dalam rangkap 2 (dua) bermaterai cukup dan masing-masing mempunyai kekuatan hukum yang sama.
                  </p>

                  <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[11px]">
                    <div className="space-y-12">
                      <div>
                        <strong>PIHAK PERTAMA</strong>
                        <div className="text-muted-foreground">PT Montana Global Investama</div>
                      </div>
                      <div className="border-t border-muted-foreground/40 pt-1 font-bold">
                        {doc.approver?.name ?? "Ir. Suryo Montana, M.B.A."}
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Managing Director
                        </div>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div>
                        <strong>PIHAK KEDUA</strong>
                        <div className="text-muted-foreground">Mitra Rekanan / Vendor</div>
                      </div>
                      <div className="border-t border-muted-foreground/40 pt-1 font-bold">
                        Authorized Representative
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Direktur Utama
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer page number */}
            <div className="border-t pt-3 text-center text-[10px] text-muted-foreground">
              Hal {currentPage} dari {totalPages} &bull; PT Montana Global Investama
            </div>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
