<?php
// ==========================================================
// MGI ERP / HRIS - Printable Expense Requests List Report
// GET /backend/api/hrga/expense-list-print.php
// ==========================================================

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/auth.php';

// Override application/json header from response helper so browser renders HTML
header('Content-Type: text/html; charset=UTF-8');

$user = requireRole([2, 6, 7]);
$pdo = getDbConnection();

$status = $_GET['status'] ?? 'all';
$category = $_GET['category'] ?? 'all';
$search = trim($_GET['search'] ?? '');

$where = [];
$params = [];

if (!empty($status) && $status !== 'all') {
    $where[] = "er.status = :status";
    $params[':status'] = $status;
}

if (!empty($category) && $category !== 'all') {
    $where[] = "er.category = :category";
    $params[':category'] = $category;
}

if (!empty($search)) {
    $where[] = "(er.ticket_number LIKE :search OR er.title LIKE :search OR u.email LIKE :search)";
    $params[':search'] = "%$search%";
}

$whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

$sql = "
    SELECT 
        er.*,
        u.email AS creator_email,
        COALESCE(up.name, u.email) AS creator_name,
        approver.email AS approver_email,
        COALESCE(approver_p.name, approver.email) AS approver_name,
        verifier.email AS verifier_email,
        COALESCE(verifier_p.name, verifier.email) AS verifier_name
    FROM expense_requests er
    JOIN users u ON er.created_by = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN users approver ON er.approved_by = approver.id
    LEFT JOIN user_profiles approver_p ON approver.id = approver_p.user_id
    LEFT JOIN users verifier ON er.verified_by = verifier.id
    LEFT JOIN user_profiles verifier_p ON verifier.id = verifier_p.user_id
    $whereClause
    ORDER BY er.created_at DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$totalEst = 0;
$totalReal = 0;
foreach ($rows as $r) {
    $totalEst += (float)$r['amount'];
    $totalReal += (float)($r['realized_amount'] ?: 0);
}

$statusLabels = [
    'pending_pm' => 'Menunggu Review PM',
    'approved' => 'Disetujui PM (Estimasi)',
    'pending_verification' => 'Menunggu Cek Barang',
    'completed' => 'Sah & Selesai',
    'disbursed' => 'Telah Dicairkan',
    'rejected' => 'Ditolak'
];
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rekapitulasi Pengajuan Biaya - PT Montana Global Investama</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; font-size: 11px !important; color: #000; }
      .table td, .table th { padding: 4px 6px !important; font-size: 11px !important; }
    }
    body {
      background-color: #f8f9fa;
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 12px;
      color: #333;
    }
    .report-card {
      max-width: 1050px;
      margin: 20px auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      padding: 24px;
    }
    .header-border {
      border-bottom: 2px solid #0d6efd;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .table td, .table th {
      padding: 6px 8px;
    }
  </style>
</head>
<body>

<div class="container-fluid">
  <div class="no-print my-2 text-center">
    <button onclick="window.print()" class="btn btn-primary btn-sm me-2">
      <i class="bi bi-printer me-1"></i> Cetak / Simpan PDF
    </button>
    <button onclick="window.close()" class="btn btn-outline-secondary btn-sm">
      <i class="bi bi-x-circle me-1"></i> Tutup
    </button>
  </div>

  <div class="report-card">
    <div class="header-border d-flex justify-content-between align-items-center">
      <div>
        <h5 class="fw-bold text-primary mb-0">PT MONTANA GLOBAL INVESTAMA</h5>
        <div class="text-muted small">Laporan Rekapitulasi Tiket Pengajuan Biaya & Realisasi Belanja</div>
      </div>
      <div class="text-end">
        <div class="small text-muted">Tanggal Cetak: <?= date('d/m/Y H:i') ?></div>
        <div class="small fw-semibold">Dicetak Oleh: <?= htmlspecialchars($user['name']) ?> (<?= htmlspecialchars($user['role_name']) ?>)</div>
      </div>
    </div>

    <!-- Summary box -->
    <div class="row g-2 mb-3">
      <div class="col-md-4">
        <div class="p-2 border rounded bg-light">
          <span class="text-muted small">Total Tiket:</span>
          <strong class="d-block fs-6"><?= count($rows) ?> Tiket</strong>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-2 border rounded bg-light">
          <span class="text-muted small">Total Estimasi Pengajuan:</span>
          <strong class="d-block fs-6 text-primary">Rp <?= number_format($totalEst, 0, ',', '.') ?></strong>
        </div>
      </div>
      <div class="col-md-4">
        <div class="p-2 border rounded bg-light">
          <span class="text-muted small">Total Realisasi Belanja:</span>
          <strong class="d-block fs-6 text-success">Rp <?= number_format($totalReal, 0, ',', '.') ?></strong>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-responsive">
      <table class="table table-bordered table-striped align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th style="width: 35px;" class="text-center">No</th>
            <th>No. Tiket</th>
            <th>Tanggal</th>
            <th>Keperluan / Judul</th>
            <th>Kategori</th>
            <th class="text-end">Estimasi (Rp)</th>
            <th class="text-end">Realisasi (Rp)</th>
            <th>Diajukan Oleh</th>
            <th>Status</th>
            <th>Approver PM</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($rows)): ?>
            <tr>
              <td colspan="10" class="text-center py-4 text-muted">Tidak ada data tiket pengajuan biaya.</td>
            </tr>
          <?php else: ?>
            <?php foreach ($rows as $i => $r): ?>
              <tr>
                <td class="text-center"><?= $i + 1 ?></td>
                <td class="fw-bold font-monospace"><?= htmlspecialchars($r['ticket_number']) ?></td>
                <td class="small text-nowrap"><?= date('d/m/y', strtotime($r['created_at'])) ?></td>
                <td><?= htmlspecialchars($r['title']) ?></td>
                <td><span class="badge bg-secondary text-uppercase" style="font-size: 0.7rem;"><?= htmlspecialchars($r['category']) ?></span></td>
                <td class="text-end fw-semibold"><?= number_format($r['amount'], 0, ',', '.') ?></td>
                <td class="text-end text-success fw-bold"><?= $r['realized_amount'] ? number_format($r['realized_amount'], 0, ',', '.') : '-' ?></td>
                <td class="small"><?= htmlspecialchars($r['creator_name']) ?></td>
                <td class="small">
                  <?php 
                    $st = $r['status'];
                    $badgeClass = ($st === 'completed' || $st === 'disbursed') ? 'bg-success' : (($st === 'rejected') ? 'bg-danger' : (($st === 'pending_pm') ? 'bg-warning text-dark' : 'bg-info text-dark'));
                  ?>
                  <span class="badge <?= $badgeClass ?>" style="font-size: 0.72rem;"><?= $statusLabels[$st] ?? $st ?></span>
                </td>
                <td class="small"><?= htmlspecialchars($r['approver_name'] ?: '-') ?></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>

    <div class="mt-4 d-flex justify-content-between text-center text-muted small">
      <div style="width: 200px;">
        <div>Dibuat Oleh (HRGA),</div>
        <div style="height: 60px;"></div>
        <div class="fw-bold border-top pt-1">( HRGA Officer )</div>
      </div>
      <div style="width: 200px;">
        <div>Disetujui Oleh (Project Manager),</div>
        <div style="height: 60px;"></div>
        <div class="fw-bold border-top pt-1">( Project Manager )</div>
      </div>
      <div style="width: 200px;">
        <div>Pencairan Kas (Petty Cash),</div>
        <div style="height: 60px;"></div>
        <div class="fw-bold border-top pt-1">( Kasir / Finance )</div>
      </div>
    </div>
  </div>
</div>

</body>
</html>
