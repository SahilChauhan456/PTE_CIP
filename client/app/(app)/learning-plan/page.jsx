'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { BookOpen, GraduationCap, Award, User } from 'lucide-react';
import { fetcher, api } from '@/lib/api';
import { PageHeader, Skeleton, ErrorState, ProgressBar } from '@/components/ui';
import { formatDate } from '@/lib/ui';
import { useAuth } from '@/components/AuthProvider';

const COLUMNS = ['To Do', 'In Progress', 'Completed', 'Archived'];
const TYPE_ICON = { Certification: Award, Workshop: GraduationCap, Course: BookOpen };

export default function LearningPlanPage() {
  const { user } = useAuth();
  const [columns, setColumns] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const employeeId = user?.employee_id;

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    fetcher(`/learning-plan/${employeeId}`)
      .then((d) => setColumns(d.columns))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [employeeId]);

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const from = source.droppableId;
    const to = destination.droppableId;

    // Optimistic update.
    setColumns((prev) => {
      const next = { ...prev, [from]: [...prev[from]], [to]: [...prev[to]] };
      const [moved] = next[from].splice(source.index, 1);
      const updated = { ...moved, status: to };
      if (to === 'Completed') updated.progress_percent = 100;
      next[to].splice(destination.index, 0, updated);
      return next;
    });

    try {
      await api.patch(`/learning-plan/items/${draggableId}`, { status: to });
    } catch (e) {
      // Reload on failure.
      fetcher(`/learning-plan/${employeeId}`).then((d) => setColumns(d.columns));
    }
  }

  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <PageHeader title="Learning Plan — My Plan" subtitle="Drag cards between columns to update status" />

      {loading || !columns ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((c) => (
            <Skeleton key={c} className="h-64" />
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => (
              <Droppable droppableId={col} key={col}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl border border-line bg-ink-900/60 p-3 transition ${
                      snapshot.isDraggingOver ? 'border-accent-soft bg-ink-800' : ''
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h3 className="text-sm font-semibold text-white">{col}</h3>
                      <span className="text-xs text-slate-500">{columns[col].length}</span>
                    </div>
                    <div className="space-y-3">
                      {columns[col].map((item, index) => (
                        <Draggable draggableId={item.id} index={index} key={item.id}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`rounded-lg border border-line bg-ink-800 p-3 ${
                                snap.isDragging ? 'ring-2 ring-accent-soft' : ''
                              }`}
                            >
                              <Item item={item} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {columns[col].length === 0 ? (
                        <p className="px-1 py-6 text-center text-xs text-slate-600">No items</p>
                      ) : null}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}

function Item({ item }) {
  const Icon = TYPE_ICON[item.course_type] || BookOpen;
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-white">{item.title || 'Untitled course'}</p>
      <div className="space-y-1 text-xs text-slate-400">
        <p className="flex items-center gap-1.5">
          <Icon size={13} /> {item.course_type || 'Course'}
          {item.duration_hours ? ` · ${item.duration_hours} hrs` : ''}
        </p>
        {item.mentor_name ? (
          <p className="flex items-center gap-1.5">
            <User size={13} /> Mentor: {item.mentor_name}
          </p>
        ) : null}
        {item.completed_at ? <p>Completed on {formatDate(item.completed_at)}</p> : null}
      </div>
      {item.status !== 'Completed' && item.status !== 'Archived' ? (
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar value={item.progress_percent || 0} color="bg-good" />
          <span className="text-xs text-slate-400">{item.progress_percent || 0}%</span>
        </div>
      ) : null}
    </div>
  );
}
