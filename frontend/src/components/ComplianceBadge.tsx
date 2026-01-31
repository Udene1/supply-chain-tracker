import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import type { ComplianceStatus } from '../types/eudr.types';

interface ComplianceBadgeProps {
    status: ComplianceStatus;
    hasGeolocation?: boolean;
    hasLegalityDocs?: boolean;
    isDeforestationFree?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

const statusConfig = {
    compliant: {
        icon: CheckCircle,
        label: 'Compliant',
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30'
    },
    pending: {
        icon: Clock,
        label: 'Pending',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30'
    },
    non_compliant: {
        icon: AlertCircle,
        label: 'Non-Compliant',
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30'
    },
    draft: {
        icon: AlertTriangle,
        label: 'Draft',
        color: 'text-orange-400',
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/30'
    }
};

const sizeConfig = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-2 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-3 py-1' },
    lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-4 py-2' }
};

export default function ComplianceBadge({
    status,
    hasGeolocation = true,
    hasLegalityDocs = true,
    isDeforestationFree = true,
    size = 'md',
    showTooltip = true
}: ComplianceBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending;
    const sizes = sizeConfig[size];
    const Icon = config.icon;

    // Build tooltip reasons
    const reasons: string[] = [];
    if (!hasGeolocation) reasons.push('Missing geolocation data');
    if (!hasLegalityDocs) reasons.push('No legality documents');
    if (!isDeforestationFree) reasons.push('Deforestation status not verified');

    return (
        <div className="relative group inline-block">
            <span className={`
                inline-flex items-center gap-1.5 rounded-full font-medium
                ${config.color} ${config.bg} ${config.border} border
                ${sizes.padding} ${sizes.text}
            `}>
                <Icon className={sizes.icon} />
                {config.label}
            </span>

            {/* Tooltip */}
            {showTooltip && reasons.length > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 whitespace-nowrap shadow-lg">
                        <div className="font-medium text-white mb-1">EUDR Issues:</div>
                        <ul className="space-y-0.5">
                            {reasons.map((reason, i) => (
                                <li key={i} className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-red-400" />
                                    {reason}
                                </li>
                            ))}
                        </ul>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple inline version for tables
export function ComplianceStatusDot({ status }: { status: ComplianceStatus }) {
    const colors = {
        compliant: 'bg-green-400',
        pending: 'bg-yellow-400',
        non_compliant: 'bg-red-400',
        draft: 'bg-orange-400'
    };

    return (
        <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || colors.pending}`} />
    );
}
