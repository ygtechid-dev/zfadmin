import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (perPage: number) => void;
    showItemsPerPage?: boolean;
}

export default function Pagination({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPage = true
}: PaginationProps) {
    const safeTotalItems = Number.isFinite(totalItems) && totalItems > 0 ? Math.floor(totalItems) : 0;
    const safePerPage = Number.isFinite(itemsPerPage) && itemsPerPage > 0 ? Math.floor(itemsPerPage) : 10;
    const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePerPage));
    const safeCurrentPage = Number.isFinite(currentPage) && currentPage >= 1
        ? Math.min(Math.floor(currentPage), totalPages)
        : 1;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);

            if (safeCurrentPage > 3) pages.push('...');

            const start = Math.max(2, safeCurrentPage - 1);
            const end = Math.min(totalPages - 1, safeCurrentPage + 1);

            for (let i = start; i <= end; i++) pages.push(i);

            if (safeCurrentPage < totalPages - 2) pages.push('...');

            pages.push(totalPages);
        }

        return pages;
    };

    if (safeTotalItems === 0) {
        return null;
    }

    return (
        <div className="flex items-center justify-between py-3 px-4 border-t bg-gray-50/50">
            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                    Total <strong>{safeTotalItems}</strong>
                </span>
                {showItemsPerPage && onItemsPerPageChange && (
                    <select
                        value={safePerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        className="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white"
                    >
                        <option value={10}>10/page</option>
                        <option value={20}>20/page</option>
                        <option value={50}>50/page</option>
                    </select>
                )}
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(safeCurrentPage - 1)}
                    disabled={safeCurrentPage <= 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={18} />
                </button>

                {getPageNumbers().map((page, idx) => (
                    page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={`min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors ${safeCurrentPage === page
                                ? 'bg-amber-500 text-white'
                                : 'hover:bg-gray-100 text-gray-700'
                                }`}
                        >
                            {page}
                        </button>
                    )
                ))}

                <button
                    onClick={() => onPageChange(safeCurrentPage + 1)}
                    disabled={safeCurrentPage >= totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronRight size={18} />
                </button>

                <div className="flex items-center gap-2 ml-3">
                    <span className="text-sm text-gray-500">Go to</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={safeCurrentPage}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val >= 1 && val <= totalPages) onPageChange(val);
                        }}
                        className="w-14 px-2 py-1 text-sm border border-gray-200 rounded-md text-center"
                    />
                </div>
            </div>
        </div>
    );
}
