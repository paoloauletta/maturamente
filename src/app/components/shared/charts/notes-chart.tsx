"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyStudyActivity } from "@/utils/study-sessions";

interface NotesChartProps {
  monthlyActivity: MonthlyStudyActivity[];
  subjectColor?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

export function NotesChart({
  monthlyActivity,
  subjectColor = "#3b82f6",
}: NotesChartProps) {
  const [mounted, setMounted] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [isMobile, setIsMobile] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // Common breakpoint for 'md'
    };

    // Initial check
    checkScreenSize();
    setMounted(true);

    // Add event listener
    window.addEventListener("resize", checkScreenSize);

    // Cleanup event listener on component unmount
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  if (!mounted) {
    return null;
  }

  // Process activity data based on screen size
  const processedActivity = isMobile
    ? monthlyActivity.slice(-3)
    : monthlyActivity;

  // Transform data for charts - only study time in hours
  const chartData = processedActivity.map((activity) => ({
    month: activity.month,
    ore: Math.round((activity.studyTimeMinutes / 60) * 10) / 10, // Convert to hours with 1 decimal
  }));

  // Format time for display
  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length > 0) {
      const studyHours = payload[0]?.value || 0;

      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {label}
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: subjectColor }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Tempo di studio:{" "}
              <span className="font-medium">
                {formatStudyTime(studyHours * 60)}
              </span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const commonXAxisProps = {
    dataKey: "month",
    className: "text-xs fill-muted-foreground",
    tick: { fontSize: 12, dy: 5 },
    axisLine: { stroke: "hsl(var(--border))" },
    tickLine: { stroke: "hsl(var(--border))" },
  };

  const commonYAxisProps = {
    className: "text-xs fill-muted-foreground",
    tick: { fontSize: 12, dx: -5 },
    axisLine: { stroke: "hsl(var(--border))" },
    tickLine: { stroke: "hsl(var(--border))" },
    domain: [0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.1), 1)] as [
      number,
      (dataMax: number) => number
    ],
    allowDecimals: true,
  };

  const RechartsBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 0,
          left: 0,
          bottom: 5,
        }}
        barGap={4}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-muted/50"
          vertical={false}
        />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f3f3" }} />
        <Bar
          dataKey="ore"
          name="ore"
          fill={subjectColor}
          radius={[4, 4, 0, 0]}
          barSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const RechartsLineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 0,
          left: 0,
          bottom: 5,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-muted/50"
          vertical={false}
        />
        <XAxis {...commonXAxisProps} />
        <YAxis {...commonYAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="ore"
          name="ore"
          stroke={subjectColor}
          strokeWidth={3}
          dot={{
            fill: subjectColor,
            strokeWidth: 0,
            r: 4,
          }}
          activeDot={{
            r: 7,
            stroke: subjectColor,
            strokeWidth: 2,
            fill: subjectColor,
          }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );

  // Calculate totals for header
  const totalStudyTime = monthlyActivity.reduce(
    (sum, activity) => sum + activity.studyTimeMinutes,
    0
  );
  const totalSessions = monthlyActivity.reduce(
    (sum, activity) => sum + activity.sessionCount,
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3 md:pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Clock
                className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0"
                style={{ color: subjectColor }}
              />
              <span className="truncate">Tempo di studio mensile</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Ore dedicate allo studio degli appunti negli ultimi{" "}
              {isMobile ? "3" : "6"} mesi
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
                className={`text-xs w-full md:w-auto ${
                  chartType === "bar" ? "text-white" : "text-foreground"
                }`}
                style={
                  chartType === "bar" ? { backgroundColor: subjectColor } : {}
                }
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Barre
              </Button>
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("line")}
                className={`text-xs w-full md:w-auto ${
                  chartType === "line" ? "text-white" : "text-foreground"
                }`}
                style={
                  chartType === "line" ? { backgroundColor: subjectColor } : {}
                }
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Linea
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartType === "bar" ? <RechartsBarChart /> : <RechartsLineChart />}
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground text-center w-full">
          Totale ore:{" "}
          <span className="font-bold" style={{ color: subjectColor }}>
            {formatStudyTime(totalStudyTime)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
