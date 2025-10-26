import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart as RechartsAreaChart
} from 'recharts';

// Patch console early (module scope) to suppress noisy Recharts warnings before first render
let __rechartsConsolePatched = false;
(() => {
  if (__rechartsConsolePatched) return;
  const originalWarn = console.warn;
  const originalError = console.error;

  const shouldSuppress = (args: any[]) => {
    const message = String(args[0] || '');
    const fullMessage = args.map(a => String(a)).join(' ');
    return (
      message.includes('Support for defaultProps') ||
      message.includes('defaultProps') ||
      fullMessage.includes('Received NaN') && fullMessage.includes('recharts') ||
      // Some React dev warnings for Recharts render path
      fullMessage.includes('XAxis') && message.includes('Support for defaultProps') ||
      fullMessage.includes('YAxis') && message.includes('Support for defaultProps')
    );
  };

  console.warn = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    return originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    return originalError.apply(console, args);
  };

  __rechartsConsolePatched = true;
})();

// Warning-free wrapper components
export const BarChart: React.FC<any> = (props) => {
  return <RechartsBarChart {...props} />;
};

export const XAxis: React.FC<any> = (props) => {
  return <RechartsXAxis {...props} />;
};

export const YAxis: React.FC<any> = (props) => {
  return <RechartsYAxis {...props} />;
};

export const PieChart: React.FC<any> = (props) => {
  return <RechartsPieChart {...props} />;
};

export const LineChart: React.FC<any> = (props) => {
  return <RechartsLineChart {...props} />;
};

export const AreaChart: React.FC<any> = (props) => {
  const { children, ...chartProps } = props;
  return (
    <RechartsAreaChart {...chartProps}>
      {children}
    </RechartsAreaChart>
  );
};

// Re-export other components as-is
export {
  Bar,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Pie,
  Line,
  Area
};
