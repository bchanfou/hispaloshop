import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, FileText, Check } from 'lucide-react';

const FileUpload = ({ 
  label, 
  accept = '.pdf,.jpg,.jpeg,.png', 
  maxSize = 5, // MB
  files = [], 
  onChange,
  multiple = false,
  hint
}) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState([]);

  const validateFile = (file) => {
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `El archivo ${file.name} excede el tamaño máximo de ${maxSize}MB`;
    }
    return null;
  };

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const newErrors = [];
    const validFiles = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
        });
      }
    });

    setErrors(newErrors);
    
    if (validFiles.length > 0) {
      onChange(multiple ? [...files, ...validFiles] : validFiles);
    }
  };

  // Revoke all blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
  }, [files]);

  const removeFile = (id) => {
    const toRemove = files.find(f => f.id === id);
    if (toRemove?.preview) URL.revokeObjectURL(toRemove.preview);
    onChange(files.filter(f => f.id !== id));
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-stone-900 mb-2">
          {label}
        </label>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-stone-400 bg-stone-50'
            : 'border-stone-200 hover:border-stone-400'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-stone-500 mb-2" />
        <p className="text-sm text-stone-900 font-medium">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="text-xs text-stone-500 mt-1">
          Máximo {maxSize}MB • {accept.split(',').join(', ')}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {hint && <p className="text-xs text-stone-500 mt-2">{hint}</p>}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-xs text-stone-600">{error}</p>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
              {file.preview ? (
                <img src={file.preview} alt="" className="w-10 h-10 rounded object-cover" />
              ) : (
                <FileText className="w-10 h-10 text-stone-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{file.name}</p>
                <p className="text-xs text-stone-500">{file.size}</p>
              </div>
              <Check className="w-5 h-5 text-stone-700" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                className="p-1 hover:bg-stone-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
