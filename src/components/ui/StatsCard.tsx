import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  trend?: string;
  color?: 'primary' | 'accent' | 'success' | 'warning';
}

export default function StatsCard({ icon: Icon, label, value, trend, color = 'primary' }: StatsCardProps) {
  return (
    <div className={`stats-card stats-card-${color}`}>
      <div className="stats-icon">
        <Icon size={24} />
      </div>
      <div className="stats-content">
        <span className="stats-label">{label}</span>
        <span className="stats-value">{value}</span>
        {trend && <span className="stats-trend">{trend}</span>}
      </div>
    </div>
  );
}
