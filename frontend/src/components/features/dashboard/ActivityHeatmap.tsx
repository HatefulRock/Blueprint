import React from 'react';

interface HeatmapData {
  date: string;
  vocabulary: number;
  grammar: number;
  writing: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  title?: string;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  data,
  title = 'Activity Heatmap',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="text-center py-8 text-slate-400">No activity data available</div>
      </div>
    );
  }

  // Calculate total activity per day
  const dataWithTotals = data.map((d) => ({
    ...d,
    total: d.vocabulary + d.grammar + d.writing,
  }));

  // Find max activity for color scaling
  const maxActivity = Math.max(...dataWithTotals.map((d) => d.total), 1);

  // Group data by weeks
  const weeks: HeatmapData[][] = [];
  let currentWeek: HeatmapData[] = [];

  dataWithTotals.forEach((day, index) => {
    currentWeek.push(day);

    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    // If it's Saturday or the last item, start a new week
    if (dayOfWeek === 6 || index === dataWithTotals.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Get color based on activity level
  const getColor = (activity: number): string => {
    if (activity === 0) return '#1e293b'; // slate-800
    const intensity = activity / maxActivity;

    if (intensity > 0.75) return '#0ea5e9'; // sky-500
    if (intensity > 0.5) return '#0c4a6e'; // sky-900
    if (intensity > 0.25) return '#164e63'; // cyan-900
    return '#334155'; // slate-700
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const cellSize = 14;
  const cellGap = 3;
  const weekWidth = cellSize + cellGap;

  return (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Day labels */}
          <div className="flex items-start gap-2 mb-2">
            <div className="w-12 flex flex-col gap-[3px] text-xs text-slate-400">
              <div style={{ height: cellSize }}>Sun</div>
              <div style={{ height: cellSize }}>Mon</div>
              <div style={{ height: cellSize }}>Tue</div>
              <div style={{ height: cellSize }}>Wed</div>
              <div style={{ height: cellSize }}>Thu</div>
              <div style={{ height: cellSize }}>Fri</div>
              <div style={{ height: cellSize }}>Sat</div>
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const dayData = week.find((d) => {
                      const date = new Date(d.date);
                      return date.getDay() === dayIndex;
                    });

                    if (!dayData) {
                      return (
                        <div
                          key={dayIndex}
                          style={{
                            width: cellSize,
                            height: cellSize,
                          }}
                          className="rounded-sm bg-slate-800/50"
                        />
                      );
                    }

                    const total = dayData.vocabulary + dayData.grammar + dayData.writing;

                    return (
                      <div
                        key={dayIndex}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: getColor(total),
                        }}
                        className="rounded-sm cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all group relative"
                        title={`${formatDate(dayData.date)}: ${total} activities`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 whitespace-nowrap">
                          <div className="bg-slate-900 border border-slate-600 rounded-lg p-2 shadow-xl text-xs">
                            <div className="text-white font-medium mb-1">
                              {formatDate(dayData.date)}
                            </div>
                            <div className="space-y-1 text-slate-300">
                              <div>📚 Vocab: {dayData.vocabulary}</div>
                              <div>📝 Grammar: {dayData.grammar}</div>
                              <div>✍️ Writing: {dayData.writing}</div>
                              <div className="pt-1 border-t border-slate-700 font-medium">
                                Total: {total}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                <div
                  key={i}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: getColor(intensity * maxActivity),
                  }}
                  className="rounded-sm"
                />
              ))}
            </div>
            <span>More</span>
          </div>

          {/* Stats summary */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-sky-400">
                {dataWithTotals.reduce((sum, d) => sum + d.vocabulary, 0)}
              </div>
              <div className="text-xs text-slate-400">Vocabulary Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {dataWithTotals.reduce((sum, d) => sum + d.grammar, 0)}
              </div>
              <div className="text-xs text-slate-400">Grammar Exercises</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {dataWithTotals.reduce((sum, d) => sum + d.writing, 0)}
              </div>
              <div className="text-xs text-slate-400">Writing Submissions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
