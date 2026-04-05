'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useUser, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/hooks/use-language';
import { getCropDisplayName } from '@/lib/get-crop-display-name';

export function NotificationBell() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { t } = useLanguage();

    const notificationsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
    }, [firestore, user]);

    const { data: notifications } = useCollection<any>(notificationsQuery);

    const unreadCount = notifications?.length || 0;

    const handleOpenChange = (open: boolean) => {
        if (!open && notifications && firestore && user) {
            notifications.forEach(notif => {
                const notifRef = doc(firestore, 'users', user.uid, 'notifications', notif.id);
                deleteDocumentNonBlocking(notifRef);
            });
        }
    };
    
    const getMessage = (notif: any) => {
        if (notif.messageKey && notif.messagePayload) {
            if (notif.messageKey === 'dashboard.offerStatusUpdate') {
                const cropName = getCropDisplayName(notif.messagePayload.cropName, t);
                const status = t(`myOffers.status.${notif.messagePayload.status}`);
                return t(notif.messageKey, { cropName: cropName, newStatus: status });
            }
            if (notif.messageKey === 'notifications.newOrder') {
                let buyerDisplayName = notif.messagePayload.buyerName;
                if (!buyerDisplayName || buyerDisplayName.toLowerCase() === 'anonymous_buyer') {
                    buyerDisplayName = t('dashboard.anonymous_buyer');
                }
                
                let itemsSummary = '';
                if (notif.messagePayload.items) {
                    itemsSummary = notif.messagePayload.items.map((item: any) => {
                        const itemName = getCropDisplayName(item.name, t);
                        const nameWithSample = item.isSample ? t('marketplace.sampleName', { cropName: itemName }) : itemName;
                        return `${nameWithSample} (x${item.quantity})`;
                    }).join(', ');
                } else if (notif.messagePayload.itemsSummary) {
                    // Fallback for old notifications
                    itemsSummary = notif.messagePayload.itemsSummary;
                }

                return t(notif.messageKey, {
                    buyerName: buyerDisplayName,
                    itemsSummary: itemsSummary
                });
            }
            if (notif.messageKey === 'notifications.newOfferReceived') {
                let buyerDisplayName = notif.messagePayload.buyerName;
                if (!buyerDisplayName || buyerDisplayName.toLowerCase() === 'anonymous_buyer') {
                    buyerDisplayName = t('dashboard.anonymous_buyer');
                }
                const cropName = getCropDisplayName(notif.messagePayload.cropName, t);
                return t(notif.messageKey, {
                    buyerName: buyerDisplayName,
                    cropName: cropName,
                });
            }
        }
        return notif.message || ''; // Fallback for old/other notifications
    };

    return (
        <DropdownMenu onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                    <Bell />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full flex items-center justify-center text-xs"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">{t('notifications.open')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>{t('notifications.title')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications && notifications.length > 0 ? (
                    notifications.map(notif => (
                        <Link href={notif.link || '#'} key={notif.id} passHref>
                            <DropdownMenuItem
                                className="flex flex-col items-start gap-1 whitespace-normal"
                                style={{ cursor: 'pointer' }}
                            >
                                <p className="text-sm">{getMessage(notif)}</p>
                                <p className="text-xs text-muted-foreground">
                                    {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : ''}
                                </p>
                            </DropdownMenuItem>
                        </Link>
                    ))
                ) : (
                    <p className="p-4 text-sm text-center text-muted-foreground">{t('notifications.none')}</p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

    