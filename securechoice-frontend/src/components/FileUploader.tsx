import React, { useState, useCallback, useRef } from 'react';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  uploadedAt: Date;
  file?: File;
}

interface FileUploaderProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesUploaded,
  maxFiles = 10,
  maxFileSize = 25,
  acceptedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  className = '',
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const simulateUpload = (fileData: UploadedFile): Promise<UploadedFile> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Simulate processing phase
          setTimeout(() => {
            const completedFile: UploadedFile = {
              ...fileData,
              progress: 100,
              status: 'completed'
            };
            resolve(completedFile);
          }, 1000);
        }
        
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === fileData.id 
              ? { ...f, progress, status: progress < 100 ? 'uploading' : 'processing' }
              : f
          )
        );
      }, 200);
    });
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const validateFile = (file: File): string | null => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        return `File type not supported. Please upload PDF or DOCX files only.`;
      }

      // Check file size (convert MB to bytes)
      if (file.size > maxFileSize * 1024 * 1024) {
        return `File size exceeds ${maxFileSize}MB limit.`;
      }

      return null;
    };

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      const uploadedFile: UploadedFile = {
        id: generateFileId(),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: validationError ? 'error' : 'uploading',
        errorMessage: validationError || undefined,
        uploadedAt: new Date(),
        file: file
      };
      
      newFiles.push(uploadedFile);
    }
    
    setUploadingFiles(prev => [...prev, ...newFiles]);
    
    // Process valid files
    const validFiles = newFiles.filter(f => f.status !== 'error');
    const uploadPromises = validFiles.map(fileData => simulateUpload(fileData));
    
    try {
      const completedFiles = await Promise.all(uploadPromises);
      setUploadingFiles(prev => 
        prev.map(f => {
          const completed = completedFiles.find(cf => cf.id === f.id);
          return completed || f;
        })
      );
      onFilesUploaded(completedFiles);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [maxFiles, maxFileSize, acceptedTypes, onFilesUploaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading': return 'text-blue-600';
      case 'processing': return 'text-amber-600';
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing...';
      case 'completed': return 'Complete';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          disabled 
            ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50'
            : isDragOver
              ? 'border-[#1993e5] bg-blue-50 cursor-pointer'
              : 'border-[#d0dee7] hover:border-[#1993e5] hover:bg-slate-50 cursor-pointer'
        }`}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}
        onClick={disabled ? undefined : handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-[#4e7a97]">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-[#0e161b] mb-2">
              Drop your policy documents here
            </p>
            <p className="text-sm text-[#4e7a97] mb-4">
              or <span className="text-[#1993e5] font-medium">browse files</span> to upload
            </p>
            <p className="text-xs text-[#4e7a97]">
              Supports PDF and DOCX files up to {maxFileSize}MB each
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadingFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-[#0e161b]">Upload Progress</h4>
          {uploadingFiles.map((file) => (
            <div key={file.id} className="border border-[#d0dee7] rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0e161b] truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-[#4e7a97]">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-xs font-medium ${getStatusColor(file.status)}`}>
                    {getStatusText(file.status)}
                  </span>
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-[#4e7a97] hover:text-red-600 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {file.status === 'error' && file.errorMessage && (
                <p className="text-xs text-red-600 mb-2">{file.errorMessage}</p>
              )}
              
              {(file.status === 'uploading' || file.status === 'processing') && (
                <div className="w-full bg-[#d0dee7] rounded-full h-2">
                  <div
                    className="bg-[#1993e5] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              )}
              
              {file.status === 'completed' && (
                <div className="flex items-center gap-2 text-green-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                  </svg>
                  <span className="text-xs">Ready for analysis</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader; 