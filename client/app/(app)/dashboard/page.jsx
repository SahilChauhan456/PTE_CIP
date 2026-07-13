'use client';

import useSWR from 'swr';
import {
  Users,
  Boxes,
  TrendingUp,
  BookOpen,
  Award,
  UserCheck,
  UserCog,
  AlertTriangle,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import { Card, LoadingCards, ErrorState, ProgressBar } from '@/components/ui';
import { gapCellClass } from '@/lib/ui';

const KPI_META = [
  { key: 'total_employees', label: 'Total Employees', icon: Users, color: 'bg-accent' },
  { key: 'strategic_skills', label: 'Strategic Skills', icon: Boxes, color: 'bg-good' },
  { key: 'average_role_readiness_percent', label: 'Meets Target', icon: TrendingUp, color: 'bg-cyan-600', suffix: '%' },
  { key: 'average_training_progress_percent', label: 'Training Completion', icon: BookOpen, color: 'bg-purple-600', suffix: '%' },
  { key: 'certified_employees', label: 'Certified Employees', icon: Award, color: 'bg-bad' },
  { key: 'active_mentors', label: 'Active Mentors', icon: UserCheck, color: 'bg-accent' },
  { key: 'identified_smes', label: 'Identified SMEs', icon: UserCog, color: 'bg-emerald-700' },
  { key: 'critical_skill_count', label: 'Critical Skill Gaps', icon: AlertTriangle, color: 'bg-warn' },
];

function KpiCard({ meta, value }) {
  const Icon = meta.icon;
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${meta.color} text-white`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-slate-400">{meta.label}</p>
        <p className="text-2xl font-semibold text-white">
          {value ?? '—'}
          {value != null && meta.suffix ? meta.suffix : ''}
        </p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR('/dashboard/executive', fetcher);

  if (error) return <ErrorState error={error} />;
  if (isLoading || !data) return <LoadingCards count={8} />;

  const { kpis, skillCoverageByDepartment, capabilityGapHeatmap } = data;

  // Pivot the heatmap into rows (skill area) x columns (departments).
  const departments = [];
  const areaMap = {};
  for (const cell of capabilityGapHeatmap) {
    if (!departments.find((d) => d.code === cell.department_code)) {
      departments.push({ code: cell.department_code, name: cell.department_name });
    }
    if (!areaMap[cell.skill_area]) areaMap[cell.skill_area] = {};
    areaMap[cell.skill_area][cell.department_code] = cell.avg_gap;
  }
  const areas = Object.keys(areaMap);

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_META.map((meta) => (
          <KpiCard key={meta.key} meta={meta} value={kpis[meta.key]} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Skill coverage by department */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-white">Skill Coverage by Department</h3>
          <div className="space-y-3">
            {skillCoverageByDepartment.map((d) => (
              <div key={d.department} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-slate-300">{d.department}</span>
                <div className="flex-1">
                  <ProgressBar value={Number(d.coverage_percent) || 0} />
                </div>
                <span className="w-10 text-right text-sm font-medium text-slate-200">
                  {Number(d.coverage_percent) || 0}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Capability gap heatmap */}
        <Card className="overflow-x-auto">
          <h3 className="mb-4 text-base font-semibold text-white">Capability Gap Heatmap</h3>
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-slate-500"></th>
                {departments.map((d) => (
                  <th key={d.code} className="px-1 text-center text-[10px] font-medium text-slate-400" title={d.name}>
                    {d.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area}>
                  <td className="whitespace-nowrap pr-2 text-xs text-slate-300">{area}</td>
                  {departments.map((d) => {
                    const gap = areaMap[area][d.code];
                    return (
                      <td key={d.code} className="p-0">
                        <div
                          className={`h-7 w-full rounded ${gap == null ? 'bg-slate-800' : gapCellClass(gap)}`}
                          title={gap == null ? 'No data' : `Avg gap: ${gap}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-good/70" /> On track</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-warn/70" /> Moderate gap</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-bad/70" /> Critical gap</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
