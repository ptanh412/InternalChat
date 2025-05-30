import React, { useState, useEffect, useCallback } from 'react';
import { FaArrowLeft, FaArrowRight, FaDownload, FaTimes } from 'react-icons/fa';

const ImageViewerModal = ({
    isOpen,
    onClose,
    initialImage,
    images,
    onDownload
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Find the index of the initial image
    useEffect(() => {
        if (initialImage && images.length > 0) {
            const index = images.findIndex(img => img._id === initialImage._id);
            setCurrentIndex(index >= 0 ? index : 0);
        }
    }, [initialImage, images]);

    const handleNext = useCallback(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, [images.length]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    }, [images.length]);

    const handleDownload = useCallback(() => {
        if (images[currentIndex]) {
            const currentImage = images[currentIndex];
            const downloadUrl = currentImage.fileUrl;

            // Xử lý tải xuống hình ảnh từ Cloudinary
            fetch(downloadUrl)
                .then(response => response.blob())
                .then(blob => {
                    // Tạo URL đối tượng cho blob
                    const blobUrl = window.URL.createObjectURL(blob);

                    // Tạo thẻ a để tải xuống
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = currentImage.fileName || `image-${currentImage._id}`;

                    // Thêm vào DOM, kích hoạt và xóa
                    document.body.appendChild(link);
                    link.click();

                    // Dọn dẹp
                    setTimeout(() => {
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(blobUrl);
                    }, 100);
                })
                .catch(error => {
                    console.error("Lỗi khi tải xuống hình ảnh:", error);
                    alert("Không thể tải xuống hình ảnh. Vui lòng thử lại sau.");
                });
        }
    }, [currentIndex, images]);

    const handleThumbnailClick = useCallback((index) => {
        setCurrentIndex(index);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowLeft':
                    handlePrevious();
                    break;
                case 'ArrowRight':
                    handleNext();
                    break;
                case 'Escape':
                    onClose();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleNext, handlePrevious, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[9999] flex flex-col justify-center items-center p-4">
            {/* Close button - top right */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 transition-all duration-300"
                aria-label="Close viewer"
            >
                <FaTimes className="text-xl" />
            </button>
            {/* Download button - bottom right */}
            <button
                onClick={handleDownload}
                className="absolute top-[14px] right-12 text-white bg-black bg-opacity-50 p-3 rounded-full hover:bg-opacity-70 transition-all duration-300"
                aria-label="Download image"
            >
                <FaDownload />
            </button>

            {/* Main image container */}
            <div className="relative w-full max-w-4xl h-[70vh] flex items-center justify-center">
                {/* Previous button */}
                <button
                    onClick={handlePrevious}
                    className="absolute left-4 text-white bg-black bg-opacity-50 p-3 rounded-full hover:bg-opacity-70 transition-all duration-300"
                    aria-label="Previous image"
                >
                    <FaArrowLeft />
                </button>

                {/* Current image */}
                {images.length > 0 && (
                    <img
                        src={`http://localhost:5000/api/file/media/${images[currentIndex]?._id}`}
                        alt={images[currentIndex]?.fileName || "Image"}
                        className="max-h-full max-w-full object-contain"
                    />
                )}

                {/* Next button */}
                <button
                    onClick={handleNext}
                    className="absolute right-4 text-white bg-black bg-opacity-50 p-3 rounded-full hover:bg-opacity-70 transition-all duration-300"
                    aria-label="Next image"
                >
                    <FaArrowRight />
                </button>

            </div>

            {/* Thumbnails strip */}
            <div className="w-full max-w-4xl mt-4 bg-black bg-opacity-50 p-2 rounded-lg overflow-x-auto">
                <div className="flex space-x-2 justify-center">
                    {images.map((image, index) => {
                        const serverMediaUrl = `http://localhost:5000/api/file/media/${image._id}`;
                        return (
                            <div
                                key={image._id || index}
                                className={`
                                        h-16 w-16 flex-shrink-0 cursor-pointer rounded overflow-hidden border-2
                                        ${currentIndex === index ? 'border-blue-500' : 'border-transparent'}
                                        `}
                                onClick={() => handleThumbnailClick(index)}
                            >
                                <img
                                    src={serverMediaUrl}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Image counter - bottom center */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full">
                {images.length > 0 ? `${currentIndex + 1} / ${images.length}` : '0 / 0'}
            </div>
        </div>
    );
};

export default ImageViewerModal;