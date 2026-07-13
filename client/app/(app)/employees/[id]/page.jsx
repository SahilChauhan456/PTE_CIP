'use client';

import { useParams } from 'next/navigation';
import EmployeeProfileView from '@/components/EmployeeProfileView';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  return <EmployeeProfileView employeeId={id} />;
}
