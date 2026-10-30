import AppLayout from '@/components/AppLayout';
import { id } from '@/locales/id';

const todayLabel = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeZone: 'Asia/Jakarta',
});

export default function Dashboard() {
    return (
        <AppLayout title={id.nav.dashboard}>
            <header>
                <h1 className="text-2xl font-semibold">{id.nav.dashboard}</h1>
                <p className="text-sm text-muted-foreground">
                    {todayLabel.format(new Date())}
                </p>
            </header>
        </AppLayout>
    );
}
