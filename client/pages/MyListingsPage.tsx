import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Car, ClipboardList, Loader2, PlusCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../services/api';

interface ListingPreview {
	id: string;
	make?: string;
	model?: string;
	year?: number;
	price?: number;
	status?: string;
	images?: string[];
}

const parseImages = (raw: unknown): string[] => {
	if (Array.isArray(raw)) {
		return raw.filter((url): url is string => typeof url === 'string' && url.length > 0);
	}
	if (typeof raw === 'string' && raw.trim()) {
		const trimmed = raw.trim();
		if (trimmed.startsWith('[')) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					return parsed.filter((url): url is string => typeof url === 'string' && url.length > 0);
				}
			} catch {
				return [];
			}
		}
		return trimmed.split(',').map((url) => url.trim()).filter((url) => url.length > 0);
	}
	return [];
};

const MyListingsPage: React.FC = () => {
	const { user, loading: authLoading } = useAuth();
	const { t, formatCurrencyEGP } = useLanguage();
	const [listings, setListings] = useState<ListingPreview[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchListings = useCallback(async () => {
		if (!user) return;
		setLoading(true);
		setError(null);
			try {
				const response = await apiService.getMyListings();
				if (response.error) {
					setError(response.error);
					setListings([]);
					return;
				}
				const data = response.data?.data || [];
				const normalized = data.map((item: any, index: number) => ({
					id: String(item._id || item.id || index),
					make: item.make,
					model: item.model,
					year: Number(item.year) || undefined,
					price: typeof item.price === 'number' ? item.price : Number(item.price) || undefined,
					status: item.status,
					images: parseImages(item.images),
				}));
				setListings(normalized);
			} catch {
			setError('Failed to load listings');
			} finally {
			setLoading(false);
			}
		}, [user]);

	useEffect(() => {
		fetchListings();
	}, [fetchListings]);

	if (authLoading) {
		return (
			<div className="bg-slate-50 min-h-screen flex items-center justify-center">
				<Loader2 className="animate-spin text-slate-400" size={32} />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return (
		<div className="bg-slate-50 min-h-screen py-12">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
					<div>
						<p className="text-xs uppercase tracking-[0.35em] text-slate-500 font-semibold mb-2">
							{t('My Listings', 'قائمة عربياتي')}
						</p>
						<h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
							{t('Manage your active listings', 'نظم الاعلانات النشطة')}
						</h1>
						<p className="text-slate-500 mt-2 max-w-2xl">
							{t('Review performance, check auction status, and create new listings from one place.', 'راجع الأداء وتابع حالة المزاد واعمل اعلانات جديدة من مكان واحد.')}
						</p>
					</div>
					<Link
						to="/sell"
						className="inline-flex items-center gap-2 rounded-full px-5 py-3 bg-slate-900 text-white text-sm font-semibold shadow-sm hover:bg-slate-800"
					>
						<PlusCircle size={18} />
						{t('Create listing', 'اعمل اعلان جديد')}
					</Link>
				</div>

				<div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-3">
							<div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
								<ClipboardList size={24} />
							</div>
							<div>
								<p className="text-sm text-slate-500">{t('Total listings', 'إجمالي الاعلانات')}</p>
								<p className="text-2xl font-bold text-slate-900">{listings.length}</p>
							</div>
						</div>
					</div>

					{loading ? (
						<div className="py-16 flex justify-center">
							<Loader2 className="animate-spin text-slate-400" size={28} />
						</div>
					) : error ? (
						<div className="py-16 text-center">
							<p className="text-sm text-rose-500 font-semibold">{error}</p>
							<button
								type="button"
								onClick={fetchListings}
								className="mt-4 text-sm font-semibold text-slate-900"
							>
								{t('Try again', 'حاول تاني')}
							</button>
						</div>
					) : listings.length === 0 ? (
						<div className="py-16 text-center">
							<Car size={40} className="mx-auto text-slate-400" />
							<p className="mt-4 text-lg font-semibold text-slate-900">
								{t('No listings yet', 'مافيش اعلانات لسه')}
							</p>
							<p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
								{t('Create your first listing to start receiving bids from verified buyers.', 'ابدأ اعملك اعلان جديد عشان تستقبل مزايدات من مشتريين موثوقين.')}
							</p>
						</div>
					) : (
						<div className="grid gap-5">
							{listings.map((listing) => (
								<div key={listing.id} className="flex flex-col md:flex-row gap-6 border border-slate-100 rounded-2xl p-5">
									<div className="w-full md:w-64 h-40 bg-slate-100 rounded-2xl overflow-hidden relative">
										{listing.images && listing.images.length > 0 ? (
											<img
												src={listing.images[0]}
												alt={`${listing.make} ${listing.model}`}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center text-slate-400">
												<Car size={32} />
											</div>
										)}
									</div>
									<div className="flex-1">
										<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
											<div>
												<p className="text-xs uppercase tracking-[0.35em] text-slate-400 font-semibold">
													{listing.status || t('Draft', 'مسودة')}
												</p>
												<h2 className="text-2xl font-semibold text-slate-900">
													{[listing.year, listing.make, listing.model].filter(Boolean).join(' ')}
												</h2>
											</div>
											{typeof listing.price === 'number' && !Number.isNaN(listing.price) && (
												<p className="text-lg font-semibold text-slate-900">
													{formatCurrencyEGP(listing.price)}
												</p>
											)}
										</div>
										<div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
											<span className="px-3 py-1 rounded-full border border-slate-200">
												{t('Listing ID', 'رقم الاعلان')}: {(listing.id || '').slice(-6).toUpperCase() || 'N/A'}
											</span>
											<span className="px-3 py-1 rounded-full border border-slate-200">
												{listing.status || t('Pending review', 'قيد المراجعة')}
											</span>
										</div>
										<div className="mt-6 flex flex-wrap gap-3">
											<Link
												to={`/my-listing/${listing.id}`}
												className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold"
											>
												{t('View listing', 'شوف الاعلان')}
											</Link>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default MyListingsPage;
