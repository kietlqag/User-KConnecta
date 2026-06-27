import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, Eye } from 'lucide-react';
import { postService, type PostReportResponse, type ReportCategory, type ReportStatus } from '@/services/postService';
import { toast } from 'sonner';

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  SPAM:           'Spam / Quảng cáo',
  VIOLENCE:       'Bạo lực',
  HATE_SPEECH:    'Ngôn ngữ thù địch',
  NUDITY:         'Nội dung khiêu dâm',
  MISINFORMATION: 'Thông tin sai lệch',
  OTHER:          'Lý do khác',
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:  { label: 'Chờ xem xét', className: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  REVIEWED: { label: 'Đang xem xét', className: 'bg-emerald-100 text-emerald-700',   icon: <Eye className="w-3 h-3" /> },
  RESOLVED: { label: 'Đã xử lý',    className: 'bg-green-100 text-green-700',  icon: <CheckCircle className="w-3 h-3" /> },
};

const SEVERITY_CONFIG: Record<string, { label: string; className: string }> = {
  NONE:   { label: 'Không vi phạm', className: 'bg-background text-muted-foreground' },
  LOW:    { label: 'Vi phạm nhẹ',   className: 'bg-yellow-100 text-yellow-700' },
  MEDIUM: { label: 'Vi phạm rõ',    className: 'bg-orange-100 text-orange-700' },
  HIGH:   { label: 'Vi phạm nặng',  className: 'bg-red-100 text-red-700' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function MyReportsPage() {
  const [reports, setReports] = useState<PostReportResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postService.getMyReports()
      .then(setReports)
      .catch(() => toast.error('Không thể tải danh sách báo cáo'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <h1 className="text-xl font-bold">Báo cáo của tôi</h1>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-background animate-pulse" />
          ))}
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Bạn chưa gửi báo cáo nào</p>
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => {
            const status = STATUS_CONFIG[report.status];
            const severity = report.aiSeverity ? SEVERITY_CONFIG[report.aiSeverity] : null;

            return (
              <div key={report.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {report.category && (
                      <span className="text-xs font-medium bg-red-50 text-red-600 px-2 py-1 rounded-full">
                        {CATEGORY_LABELS[report.category]}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${status.className}`}>
                      {status.icon}
                      {status.label}
                    </span>
                    {severity && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${severity.className}`}>
                        {severity.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(report.createdAt)}</span>
                </div>

                {report.reason && (
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Lý do: </span>{report.reason}
                  </p>
                )}

                {report.aiAnalysis && (
                  <div className="text-sm bg-background rounded-lg p-3 border border-border">
                    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Phân tích AI</span>
                    <p className="mt-1 text-foreground">{report.aiAnalysis}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
