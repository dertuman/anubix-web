import { CalendarIcon } from '@radix-ui/react-icons';
import { format, formatDistanceToNow } from 'date-fns';

import { cn } from '@/lib/utils';

interface FancyDateProps {
  date: string;
  formatStyle?: string;
  className?: string;
  showTime?: boolean;
  showIcon?: boolean;
  fontWeight?: string;
}

const FancyDate: React.FC<FancyDateProps> = ({
  date,
  formatStyle = 'PPP',
  className,
  showTime = false,
  showIcon = true,
  fontWeight = 'font-semibold',
}) => {
  let formattedDate = '';

  try {
    formattedDate = date
      ? format(new Date(date), showTime ? `${formatStyle} 'at' p` : formatStyle)
      : 'No date specified';
  } catch (error) {
    console.error('Invalid date:', date);
    formattedDate = 'Invalid date';
  }

  return (
    <span className={cn('flex items-center space-x-2 text-sm', className)}>
      {showIcon && <CalendarIcon className="size-5 text-[#e45165]" />}
      <span className={fontWeight}>{formattedDate}</span>
    </span>
  );
};

interface FancyTimeAgoProps {
  date: string;
  className?: string;
  containerClassName?: string;
  fontWeight?: string;
}

const FancyTimeAgo: React.FC<FancyTimeAgoProps> = ({
  date,
  className,
  containerClassName,
  fontWeight = 'font-semibold',
}) => {
  let timeAgo = '';

  try {
    if (date) {
      timeAgo = formatDistanceToNow(new Date(date), { addSuffix: true });
      timeAgo = timeAgo.replace('about ', '~ ');
      timeAgo = timeAgo.replace('less than ', '~ ');
      timeAgo = timeAgo.replace('minutes ', 'mins ');
    } else {
      timeAgo = 'No date specified';
    }
  } catch (error) {
    console.error('Invalid date:', date);
    timeAgo = 'Invalid date';
  }

  return (
    <div className={cn('flex items-center space-x-2', containerClassName)}>
      <p className={cn('select-none', fontWeight, className)}>{timeAgo}</p>
    </div>
  );
};

export { FancyDate, FancyTimeAgo };
