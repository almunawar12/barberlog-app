export type Service = {
    id: number;
    name: string;
    price: number;
    is_active: boolean;
};

export type Shop = {
    name: string;
    default_service_id: number | null;
};
