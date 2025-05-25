import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className = '', 
    label, 
    error, 
    helperText, 
    resize = 'vertical',
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = `
      w-full px-3 py-2 text-sm border rounded-md shadow-sm 
      placeholder:text-gray-400 
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50
      transition-colors duration-200
    `;

    const borderClasses = error 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 hover:border-gray-400';

    const resizeClasses = {
      none: 'resize-none',
      both: 'resize',
      horizontal: 'resize-x',
      vertical: 'resize-y'
    };

    const textareaClasses = `
      ${baseClasses} 
      ${borderClasses} 
      ${resizeClasses[resize]}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={textareaClasses}
          disabled={disabled}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span className="h-4 w-4">⚠</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;