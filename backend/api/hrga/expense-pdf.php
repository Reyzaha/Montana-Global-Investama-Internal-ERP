<?php
// ==========================================================
// MGI ERP / HRIS - Expense Request Printable / PDF Voucher
// GET /backend/api/hrga/expense-pdf.php?id={id}
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

// Override application/json header from response helper so browser renders HTML
header('Content-Type: text/html; charset=UTF-8');

$user = requireRole([2, 6, 7]);
$pdo = getDbConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    die('ID tiket pengajuan biaya tidak valid.');
}

$stmt = $pdo->prepare("
    SELECT 
        er.*,
        u.email AS creator_email,
        COALESCE(up.name, u.email) AS creator_name,
        up.position AS creator_position,
        approver.email AS approver_email,
        COALESCE(approver_p.name, approver.email) AS approver_name,
        approver_p.position AS approver_position,
        verifier.email AS verifier_email,
        COALESCE(verifier_p.name, verifier.email) AS verifier_name,
        disburser.email AS disburser_email,
        COALESCE(disburser_p.name, disburser.email) AS disburser_name
    FROM expense_requests er
    JOIN users u ON er.created_by = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN users approver ON er.approved_by = approver.id
    LEFT JOIN user_profiles approver_p ON approver.id = approver_p.user_id
    LEFT JOIN users verifier ON er.verified_by = verifier.id
    LEFT JOIN user_profiles verifier_p ON verifier.id = verifier_p.user_id
    LEFT JOIN users disburser ON er.disbursed_by = disburser.id
    LEFT JOIN user_profiles disburser_p ON disburser.id = disburser_p.user_id
    WHERE er.id = ?
");
$stmt->execute([$id]);
$data = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$data) {
    die('Tiket pengajuan biaya tidak ditemukan.');
}

// Fetch items
$itemStmt = $pdo->prepare("SELECT * FROM expense_request_items WHERE expense_request_id = ? ORDER BY id ASC");
$itemStmt->execute([$id]);
$items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

$statusLabels = [
    'pending_pm' => 'Menunggu Review PM',
    'approved' => 'Disetujui PM (Siap Belanja)',
    'pending_verification' => 'Menunggu Cek Barang & Nota',
    'completed' => 'Sah & Selesai',
    'disbursed' => 'Telah Dicairkan',
    'rejected' => 'Ditolak'
];
$statusText = $statusLabels[$data['status']] ?? strtoupper($data['status']);
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voucher Pengajuan Biaya - <?= htmlspecialchars($data['ticket_number']) ?></title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    @media print {
      .no-print { display: none !important; }
      body {
        background: #fff !important;
        color: #000 !important;
        font-size: 11px !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .container {
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .voucher-card {
        box-shadow: none !important;
        border: 1.5px solid #222 !important;
        margin: 0 !important;
        padding: 14px 18px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .table td, .table th {
        padding: 4px 6px !important;
        font-size: 11px !important;
      }
      .signature-box {
        height: 65px !important;
        border: 1px solid #777 !important;
      }
      .thumb-img {
        max-height: 45px !important;
      }
    }
    body {
      background-color: #f4f6f9;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #333;
      font-size: 12.5px;
    }
    .voucher-card {
      max-width: 800px;
      margin: 15px auto;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      padding: 20px 24px;
    }
    .header-border {
      border-bottom: 2px solid #0d6efd;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .badge-status {
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .table td, .table th {
      font-size: 11.5px;
      padding: 5px 8px;
    }
    .signature-box {
      border: 1px dashed #bbb;
      border-radius: 6px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-style: italic;
      color: #888;
      margin-top: 4px;
      background: #fafafa;
    }
    .signed-badge {
      color: #198754;
      font-weight: 600;
      font-style: normal;
      line-height: 1.2;
    }
    .thumb-box {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 4px;
      display: inline-block;
      text-align: center;
      background: #fff;
    }
    .thumb-img {
      max-height: 50px;
      max-width: 80px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
  </style>
</head>
<body>

<div class="container">
  <div class="no-print my-2 text-center">
    <button onclick="window.print()" class="btn btn-primary btn-sm me-2">
      <i class="bi bi-printer me-1"></i> Cetak / Simpan ke PDF (1 Lembar)
    </button>
    <button onclick="window.close()" class="btn btn-outline-secondary btn-sm">
      <i class="bi bi-x-circle me-1"></i> Tutup
    </button>
  </div>

  <div class="voucher-card">
    <div class="header-border d-flex justify-content-between align-items-center">
      <div>
        <h5 class="fw-bold text-primary mb-0">
          <i class="bi bi-buildings"></i> PT MONTANA GLOBAL INVESTAMA
        </h5>
        <div class="text-muted" style="font-size: 0.75rem;">Human Resources & General Affairs Department</div>
        <div class="fw-semibold text-secondary" style="font-size: 0.75rem;">Voucher Pengajuan Biaya & Realisasi Kas Kecil</div>
      </div>
      <div class="text-end">
        <h6 class="fw-bold mb-0 text-dark font-monospace"><?= htmlspecialchars($data['ticket_number']) ?></h6>
        <div class="text-muted" style="font-size: 0.72rem;">Tanggal: <?= date('d M Y H:i', strtotime($data['created_at'])) ?></div>
        <div class="mt-1">
          <?php if (in_array($data['status'], ['completed', 'disbursed'])): ?>
            <span class="badge bg-success badge-status"><?= $statusText ?></span>
          <?php elseif ($data['status'] === 'rejected'): ?>
            <span class="badge bg-danger badge-status"><?= $statusText ?></span>
          <?php elseif ($data['status'] === 'approved'): ?>
            <span class="badge bg-info text-dark badge-status"><?= $statusText ?></span>
          <?php else: ?>
            <span class="badge bg-warning text-dark badge-status"><?= $statusText ?></span>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <!-- Metadata Row -->
    <table class="table table-bordered mb-2">
      <tbody>
        <tr>
          <th class="bg-light text-muted" style="width: 20%;">Keperluan</th>
          <td class="fw-bold text-dark"><?= htmlspecialchars($data['title']) ?></td>
          <th class="bg-light text-muted" style="width: 15%;">Kategori</th>
          <td style="width: 20%;"><span class="badge bg-secondary text-uppercase"><?= htmlspecialchars($data['category']) ?></span></td>
        </tr>
        <tr>
          <th class="bg-light text-muted">Diajukan Oleh</th>
          <td><?= htmlspecialchars($data['creator_name']) ?> (<?= htmlspecialchars($data['creator_position'] ?: 'HRGA Officer') ?>)</td>
          <th class="bg-light text-muted">Keterangan</th>
          <td><?= htmlspecialchars($data['description'] ?: '-') ?></td>
        </tr>
      </tbody>
    </table>

    <!-- Table Rincian Item Barang -->
    <div class="mb-2">
      <div class="fw-bold text-dark small mb-1"><i class="bi bi-list-check me-1"></i> Rincian Item Barang & Biaya:</div>
      <table class="table table-bordered table-sm mb-0">
        <thead class="table-light">
          <tr>
            <th class="text-center" style="width: 30px;">No</th>
            <th>Nama Barang / Deskripsi</th>
            <th class="text-center" style="width: 60px;">Qty</th>
            <th class="text-center" style="width: 60px;">Satuan</th>
            <th class="text-end" style="width: 120px;">Harga Satuan (Rp)</th>
            <th class="text-end" style="width: 130px;">Subtotal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <?php if (!empty($items)): ?>
            <?php foreach ($items as $idx => $it): ?>
              <tr>
                <td class="text-center"><?= $idx + 1 ?></td>
                <td>
                  <strong><?= htmlspecialchars($it['item_name']) ?></strong>
                  <?php if (!empty($it['notes'])): ?>
                    <span class="text-muted small d-block"><?= htmlspecialchars($it['notes']) ?></span>
                  <?php endif; ?>
                </td>
                <td class="text-center"><?= (float)$it['qty'] ?></td>
                <td class="text-center"><?= htmlspecialchars($it['unit']) ?></td>
                <td class="text-end"><?= number_format($it['unit_price'], 0, ',', '.') ?></td>
                <td class="text-end fw-semibold"><?= number_format($it['total_price'], 0, ',', '.') ?></td>
              </tr>
            <?php endforeach; ?>
          <?php else: ?>
            <tr>
              <td class="text-center">1</td>
              <td><?= htmlspecialchars($data['title']) ?></td>
              <td class="text-center">1</td>
              <td class="text-center">paket</td>
              <td class="text-end"><?= number_format($data['amount'], 0, ',', '.') ?></td>
              <td class="text-end fw-semibold"><?= number_format($data['amount'], 0, ',', '.') ?></td>
            </tr>
          <?php endif; ?>
        </tbody>
        <tfoot class="table-light">
          <tr>
            <th colspan="5" class="text-end fw-bold">Grand Total Estimasi:</th>
            <th class="text-end text-primary fw-bold">Rp <?= number_format($data['amount'], 2, ',', '.') ?></th>
          </tr>
          <?php if (!empty($data['realized_amount'])): ?>
          <tr>
            <th colspan="5" class="text-end fw-bold text-success">Total Realisasi Belanja Aktual:</th>
            <th class="text-end text-success fw-bold">Rp <?= number_format($data['realized_amount'], 2, ',', '.') ?></th>
          </tr>
          <?php endif; ?>
        </tfoot>
      </table>
    </div>

    <!-- Lampiran Foto Fisik Barang & Nota Bukti -->
    <?php if (!empty($data['item_photo_path']) || !empty($data['receipt_doc_path'])): ?>
      <div class="row g-2 mb-2 p-1 bg-light rounded border">
        <div class="col-6">
          <div class="d-flex align-items-center">
            <?php if (!empty($data['item_photo_path'])): ?>
              <div class="thumb-box me-2">
                <img src="/backend/<?= htmlspecialchars($data['item_photo_path']) ?>" class="thumb-img" alt="Foto Barang">
              </div>
              <div>
                <div class="fw-bold" style="font-size: 0.75rem;"><i class="bi bi-camera me-1 text-primary"></i> Foto Fisik Barang</div>
                <div class="text-muted" style="font-size: 0.68rem;">Telah difoto & diverifikasi</div>
              </div>
            <?php else: ?>
              <span class="text-muted small" style="font-size: 0.72rem;">Belum ada foto barang</span>
            <?php endif; ?>
          </div>
        </div>
        <div class="col-6">
          <div class="d-flex align-items-center">
            <?php if (!empty($data['receipt_doc_path'])): ?>
              <div class="thumb-box me-2">
                <?php if (preg_match('/\.(jpg|jpeg|png|webp)$/i', $data['receipt_doc_path'])): ?>
                  <img src="/backend/<?= htmlspecialchars($data['receipt_doc_path']) ?>" class="thumb-img" alt="Nota">
                <?php else: ?>
                  <i class="bi bi-file-earmark-pdf fs-2 text-danger p-1"></i>
                <?php endif; ?>
              </div>
              <div>
                <div class="fw-bold" style="font-size: 0.75rem;"><i class="bi bi-receipt me-1 text-success"></i> Dokumen Nota / Faktur</div>
                <div class="text-muted" style="font-size: 0.68rem;">Lampiran kuitansi sah</div>
              </div>
            <?php endif; ?>
          </div>
        </div>
      </div>
    <?php endif; ?>

    <!-- Signature Boxes -->
    <div class="row g-2 mt-1 text-center">
      <div class="col-4">
        <div class="text-muted small fw-semibold" style="font-size: 0.75rem;">Diajukan Oleh (HRGA)</div>
        <div class="signature-box">
          <div class="signed-badge small">
            <i class="bi bi-check2-circle fs-5 d-block text-success"></i>
            <span><?= htmlspecialchars($data['creator_name']) ?></span><br>
            <span class="text-muted" style="font-size: 0.7rem;"><?= date('d/m/Y', strtotime($data['created_at'])) ?></span>
          </div>
        </div>
        <div class="mt-1 small fw-semibold" style="font-size: 0.75rem;"><?= htmlspecialchars($data['creator_name']) ?></div>
      </div>

      <div class="col-4">
        <div class="text-muted small fw-semibold" style="font-size: 0.75rem;">Disetujui Oleh (Project Manager)</div>
        <div class="signature-box">
          <?php if (!empty($data['approved_by'])): ?>
            <div class="signed-badge small">
              <i class="bi bi-patch-check-fill fs-5 d-block text-primary"></i>
              <span><?= htmlspecialchars($data['approver_name']) ?></span><br>
              <span class="text-muted" style="font-size: 0.7rem;"><?= date('d/m/Y H:i', strtotime($data['approved_at'])) ?></span>
            </div>
          <?php else: ?>
            <span class="text-muted small" style="font-size: 0.7rem;">Menunggu Review</span>
          <?php endif; ?>
        </div>
        <div class="mt-1 small fw-semibold" style="font-size: 0.75rem;"><?= htmlspecialchars($data['approver_name'] ?: 'Project Manager') ?></div>
      </div>

      <div class="col-4">
        <div class="text-muted small fw-semibold" style="font-size: 0.75rem;">Verifikasi Barang & Kasir</div>
        <div class="signature-box">
          <?php if ($data['status'] === 'completed' || $data['status'] === 'disbursed'): ?>
            <div class="signed-badge small text-success">
              <i class="bi bi-shield-check fs-5 d-block text-success"></i>
              <span>Barang Sesuai & Sah</span><br>
              <span class="text-muted" style="font-size: 0.7rem;"><?= !empty($data['verified_at']) ? date('d/m/Y', strtotime($data['verified_at'])) : date('d/m/Y') ?></span>
            </div>
          <?php else: ?>
            <span class="text-muted small" style="font-size: 0.7rem;">Menunggu Cek Fisik</span>
          <?php endif; ?>
        </div>
        <div class="mt-1 small fw-semibold" style="font-size: 0.75rem;"><?= htmlspecialchars($data['verifier_name'] ?: ($data['disburser_name'] ?: 'PM / Kasir')) ?></div>
      </div>
    </div>

    <div class="mt-2 pt-1 border-top text-muted text-center" style="font-size: 0.68rem;">
      Dokumen ini sah secara elektronik dan tercatat pada sistem MGI ERP Database.<br>
      ID Verifikasi: <?= sha1($data['id'] . $data['ticket_number'] . $data['amount']) ?>
    </div>
  </div>
</div>

</body>
</html>
