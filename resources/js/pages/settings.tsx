import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import AppLayout, { LogoutButton } from '@/components/AppLayout';
import ServiceForm from '@/components/ServiceForm';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { id } from '@/locales/id';
import settings from '@/routes/settings';
import userPassword from '@/routes/user-password';
import type { Service, Shop } from '@/types/service';

type SettingsProps = {
    shop: Shop;
    services: Service[];
};

export default function Settings({ shop, services }: SettingsProps) {
    return (
        <AppLayout title={id.nav.settings}>
            <h1 className="text-2xl font-semibold">{id.nav.settings}</h1>
            <ShopSection shop={shop} services={services} />
            <ServicesSection services={services} />
            <PasswordSection />
            <Card>
                <CardHeader>
                    <CardTitle>{id.settings.accountTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                    <LogoutButton />
                </CardContent>
            </Card>
        </AppLayout>
    );
}

function ShopSection({ shop, services }: SettingsProps) {
    const form = useForm({
        name: shop.name,
        default_service_id:
            shop.default_service_id === null
                ? ''
                : String(shop.default_service_id),
    });
    const activeServices = services.filter((service) => service.is_active);

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            default_service_id:
                data.default_service_id === ''
                    ? null
                    : Number(data.default_service_id),
        }));
        form.submit(settings.update());
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{id.settings.shopTitle}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-4">
                    <TextField
                        id="shop-name"
                        label={id.settings.shopName}
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        error={form.errors.name}
                        maxLength={100}
                        required
                    />
                    <div className="space-y-1.5">
                        <label
                            htmlFor="default-service"
                            className="text-sm font-medium"
                        >
                            {id.settings.defaultService}
                        </label>
                        <Select
                            id="default-service"
                            value={form.data.default_service_id}
                            onChange={(event) =>
                                form.setData(
                                    'default_service_id',
                                    event.target.value,
                                )
                            }
                            aria-invalid={
                                form.errors.default_service_id
                                    ? true
                                    : undefined
                            }
                            aria-describedby={
                                form.errors.default_service_id
                                    ? 'default-service-error'
                                    : undefined
                            }
                        >
                            <option value="">
                                {id.settings.noDefaultService}
                            </option>
                            {activeServices.map((service) => (
                                <option key={service.id} value={service.id}>
                                    {service.name}
                                </option>
                            ))}
                        </Select>
                        {form.errors.default_service_id && (
                            <p
                                id="default-service-error"
                                className="text-sm text-destructive"
                            >
                                {form.errors.default_service_id}
                            </p>
                        )}
                    </div>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? id.common.saving : id.common.save}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function ServicesSection({ services }: { services: Service[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{id.settings.servicesTitle}</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {id.settings.servicesHint}
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {services.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        {id.settings.noServices}
                    </p>
                )}
                {services.map((service) => (
                    <div
                        key={service.id}
                        className="border-b border-border pb-6"
                    >
                        <ServiceForm service={service} />
                    </div>
                ))}
                <div>
                    <h3 className="mb-3 text-sm font-semibold">
                        {id.settings.newService}
                    </h3>
                    <ServiceForm />
                </div>
            </CardContent>
        </Card>
    );
}

function PasswordSection() {
    const form = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.submit(userPassword.update(), {
            onSuccess: () => form.reset(),
            onError: () => form.reset('password', 'password_confirmation'),
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{id.settings.passwordTitle}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-4">
                    <TextField
                        id="current-password"
                        type="password"
                        label={id.settings.currentPassword}
                        autoComplete="current-password"
                        value={form.data.current_password}
                        onChange={(event) =>
                            form.setData('current_password', event.target.value)
                        }
                        error={form.errors.current_password}
                        required
                    />
                    <TextField
                        id="new-password"
                        type="password"
                        label={id.auth.newPassword}
                        autoComplete="new-password"
                        value={form.data.password}
                        onChange={(event) =>
                            form.setData('password', event.target.value)
                        }
                        error={form.errors.password}
                        required
                    />
                    <TextField
                        id="new-password-confirmation"
                        type="password"
                        label={id.auth.confirmPassword}
                        autoComplete="new-password"
                        value={form.data.password_confirmation}
                        onChange={(event) =>
                            form.setData(
                                'password_confirmation',
                                event.target.value,
                            )
                        }
                        error={form.errors.password_confirmation}
                        required
                    />
                    <Button type="submit" disabled={form.processing}>
                        {form.processing
                            ? id.common.saving
                            : id.auth.resetPassword}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
