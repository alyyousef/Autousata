"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  BarChart3,
  Download,
  Eye,
} from "lucide-react";
import {
  VehicleDetails,
  VehicleItem,
  getAdminVehicles,
  filterAdminVehicles,
  searchAdminVehicles,
  updateVehicleStatus,
  createInspectionReport,
  CreateInspectionPayload,
  getreport,
  editreport,
  KYCDocument,
  getPendingKYC,
  searchKYC,
  filterKYC,
  updateKYC,
  viewuser,
  LiveAuction,
  PendingPayment,
  getPendingPayments,
  getAllAuctions,
  filterAuctions,
  searchAuctions,
  updateAuctionStatus,
  setAuctionStartTime,
  getAuctionById,
  getVehicleById,
} from "../services/adminApi";
import { useToast } from "../components/Toast";

const normalizeImageList = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.filter(
      (img): img is string => typeof img === "string" && img.trim().length > 0,
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      return normalizeImageList(JSON.parse(trimmed));
    } catch {
      if (trimmed.includes(",")) {
        return trimmed
          .split(",")
          .map((img) => img.trim())
          .filter((img) => img.length > 0);
      }
      return [trimmed];
    }
  }

  if (value && typeof value === "object") {
    const maybeImages = (value as { images?: unknown }).images;
    if (maybeImages) {
      return normalizeImageList(maybeImages);
    }
  }

  return undefined;
};

const pickPrimaryImage = (...sources: unknown[]): string | undefined => {
  for (const source of sources) {
    const list = normalizeImageList(source);
    if (list && list.length > 0) {
      return list[0];
    }
  }
  return undefined;
};

const mergeImageSources = (...sources: unknown[]): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  sources.forEach((source) => {
    const list = normalizeImageList(source);
    if (!list) return;
    list.forEach((img) => {
      if (!seen.has(img)) {
        seen.add(img);
        merged.push(img);
      }
    });
  });
  return merged;
};

const ensurePrimaryLead = (list: string[], primary?: string): string[] => {
  if (!primary) return list;
  if (!list.includes(primary)) return list;
  const filtered = list.filter((img) => img !== primary);
  return [primary, ...filtered];
};

const VEHICLE_COVER_STORAGE_KEY = "AUTOUSATA:adminVehicleCover";
const AUCTION_COVER_STORAGE_KEY = "AUTOUSATA:adminAuctionCover";

const readOverrideMap = (key: string): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const persistOverrideMap = (key: string, map: Record<string, string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(map));
};

const normalizeFeatureList = (
  value?: string[] | string | null,
): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString();
};

const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  // Read token from route state (passed from LoginPage)
  const location = useLocation();
  const adminToken = (location.state as any)?.token as string | undefined;
  // Optional: fallback to localStorage if state is missing
  const effectiveToken =
    adminToken || localStorage.getItem("accessToken") || undefined;
  const [activeTab, setActiveTab] = useState<
    "vehicles" | "kyc" | "auctions" | "payments"
  >("vehicles");
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>("");
  const [showInspectionModal, setShowInspectionModal] = useState<{
    open: boolean;
    vehicle?: VehicleItem;
    viewMode?: boolean;
  }>(() => ({ open: false }));
  const [inspectionForm, setInspectionForm] =
    useState<CreateInspectionPayload | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [inspectionErrors, setInspectionErrors] = useState<string[]>([]);
  const [inspectionTouched, setInspectionTouched] = useState<Set<string>>(
    new Set(),
  );
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycSearch, setKycSearch] = useState("");
  const [kycStatusFilter, setKycStatusFilter] = useState<string>("");
  const [selectedKYC, setSelectedKYC] = useState<KYCDocument | null>(null);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [auctionsLoading, setAuctionsLoading] = useState(false);
  const [auctionsError, setAuctionsError] = useState<string | null>(null);
  const [auctionSearch, setAuctionSearch] = useState("");
  const [auctionStatusFilter, setAuctionStatusFilter] = useState<string>("");
  const [editingAuction, setEditingAuction] = useState<{
    id: string;
    field: "status" | "startTime";
    value: string;
  } | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<LiveAuction | null>(
    null,
  );
  const [showAuctionModal, setShowAuctionModal] = useState(false);
  const [selectedVehicleDetails, setSelectedVehicleDetails] =
    useState<VehicleDetails | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleDetailsLoadingId, setVehicleDetailsLoadingId] = useState<
    number | null
  >(null);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [vehicleCoverOverrides, setVehicleCoverOverrides] = useState<Record<string, string>>(
    () => readOverrideMap(VEHICLE_COVER_STORAGE_KEY),
  );
  const [auctionCoverOverrides, setAuctionCoverOverrides] = useState<Record<string, string>>(
    () => readOverrideMap(AUCTION_COVER_STORAGE_KEY),
  );
  const [selectedVehicleImageIndex, setSelectedVehicleImageIndex] = useState(0);
  const [selectedAuctionImageIndex, setSelectedAuctionImageIndex] = useState(0);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const vehicleGalleryImages = useMemo(() => {
    if (!selectedVehicleDetails) return [];
    const merged = mergeImageSources(
      selectedVehicleDetails.result,
      selectedVehicleDetails.attributes,
      selectedVehicleDetails.images,
    );
    const override = vehicleCoverOverrides[String(selectedVehicleDetails.id)];
    return override ? ensurePrimaryLead(merged, override) : merged;
  }, [selectedVehicleDetails, vehicleCoverOverrides]);

  const activeVehicleImage =
    vehicleGalleryImages[selectedVehicleImageIndex] ??
    vehicleGalleryImages[0];
  const activeVehicleIsCover = Boolean(
    selectedVehicleDetails &&
      activeVehicleImage &&
      vehicleCoverOverrides[String(selectedVehicleDetails.id)] ===
        activeVehicleImage,
  );

  const vehicleFeatureList = useMemo(() => {
    if (!selectedVehicleDetails) return [];
    return normalizeFeatureList(selectedVehicleDetails.features);
  }, [selectedVehicleDetails]);

  const vehicleSpecEntries = useMemo(() => {
    if (!selectedVehicleDetails) return [];
    return [
      {
        label: "Vehicle ID",
        value: `#${selectedVehicleDetails.id}`,
      },
      {
        label: "Sale Type",
        value:
          selectedVehicleDetails.sale_type === "auction" 
            ? "Auction"
            : selectedVehicleDetails.sale_type === "fixed_price"
              ? "Fixed Price"
              : "—",
      },
      {
        label: "Status",
        value: selectedVehicleDetails.status || "—",
      },
      {
        label: "Mileage",
        value: selectedVehicleDetails.milage
          ? `${selectedVehicleDetails.milage.toLocaleString()} km`
          : "—",
      },
      {
        label: "Location",
        value: selectedVehicleDetails.location || "—",
      },
      {
        label: "VIN",
        value: selectedVehicleDetails.vin || "—",
      },
      {
        label: "Plate",
        value: selectedVehicleDetails.plate_number || "—",
      },
      {
        label: "Color",
        value: selectedVehicleDetails.color || "—",
      },
      {
        label: "Body Type",
        value: selectedVehicleDetails.body_type || "—",
      },
      {
        label: "Transmission",
        value: selectedVehicleDetails.transmission || "—",
      },
      {
        label: "Fuel Type",
        value: selectedVehicleDetails.fuel_type || "—",
      },
      {
        label: "Seats",
        value: selectedVehicleDetails.seats
          ? selectedVehicleDetails.seats.toString()
          : "—",
      },
      {
        label: "Condition",
        value: selectedVehicleDetails.car_condition || "—",
      },
      {
        label: "Price",
        value: selectedVehicleDetails.price
          ? `${selectedVehicleDetails.price.toLocaleString()} ${selectedVehicleDetails.currency || "EGP"}`
          : "—",
      },
    ];
  }, [selectedVehicleDetails]);

  const vehicleStatusChipClass = useMemo(() => {
    const tone = selectedVehicleDetails?.status?.toLowerCase();
    if (tone === "active") {
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    }
    if (tone === "sold") {
      return "bg-slate-900 text-white border border-slate-900";
    }
    if (tone === "delisted") {
      return "bg-rose-100 text-rose-600 border border-rose-200";
    }
    if (tone === "draft") {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    return "bg-slate-100 text-slate-600 border border-slate-200";
  }, [selectedVehicleDetails]);

  useEffect(() => {
    if (
      vehicleGalleryImages.length > 0 &&
      selectedVehicleImageIndex >= vehicleGalleryImages.length
    ) {
      setSelectedVehicleImageIndex(0);
    }
  }, [vehicleGalleryImages, selectedVehicleImageIndex]);

  const auctionGalleryImages = useMemo(() => {
    if (!selectedAuction) return [];
    const merged = mergeImageSources(
      selectedAuction.vehicleImages,
      selectedAuction.result?.vehicleImages,
      selectedAuction.result,
    );
    const override = auctionCoverOverrides[String(selectedAuction.id)];
    return override ? ensurePrimaryLead(merged, override) : merged;
  }, [selectedAuction, auctionCoverOverrides]);

  const activeAuctionImage =
    auctionGalleryImages[selectedAuctionImageIndex] ??
    auctionGalleryImages[0];
  const activeAuctionIsCover = Boolean(
    selectedAuction &&
      activeAuctionImage &&
      auctionCoverOverrides[String(selectedAuction.id)] === activeAuctionImage,
  );

  useEffect(() => {
    if (
      auctionGalleryImages.length > 0 &&
      selectedAuctionImageIndex >= auctionGalleryImages.length
    ) {
      setSelectedAuctionImageIndex(0);
    }
  }, [auctionGalleryImages, selectedAuctionImageIndex]);

  // Ensure the token passed via navigation is stored for API usage
  useEffect(() => {
    if (adminToken) {
      localStorage.setItem("accessToken", adminToken);
    }
  }, [adminToken]);

  // Load vehicles based on search and filter
  useEffect(() => {
    const loadVehicles = async () => {
      setVehicleLoading(true);
      setVehicleError(null);
      try {
        let data: VehicleItem[];

        // Priority: search > filter > all
        if (vehicleSearch.trim()) {
          data = await searchAdminVehicles(
            vehicleSearch.trim(),
            effectiveToken,
          );
        } else if (vehicleStatusFilter) {
          data = await filterAdminVehicles(vehicleStatusFilter, effectiveToken);
        } else {
          data = await getAdminVehicles(effectiveToken);
        }

        setVehicles(data);
      } catch (e) {
        console.error("Vehicles fetch error:", e);
        console.error(
          "Token being used:",
          effectiveToken ? "Token exists" : "No token",
        );
        setVehicleError(
          e instanceof Error ? e.message : "Failed to load vehicles",
        );
      } finally {
        setVehicleLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadVehicles();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [vehicleSearch, vehicleStatusFilter, effectiveToken]);

  // Load KYC documents when KYC tab is active
  useEffect(() => {
    const loadKYC = async () => {
      if (activeTab !== "kyc") return;

      setKycLoading(true);
      setKycError(null);
      try {
        let data: KYCDocument[];

        // Priority: search > filter > all
        if (kycSearch.trim()) {
          data = await searchKYC(kycSearch.trim(), effectiveToken);
        } else if (kycStatusFilter) {
          data = await filterKYC(kycStatusFilter, effectiveToken);
        } else {
          data = await getPendingKYC(effectiveToken);
        }

        setKycDocuments(data || []);
      } catch (e) {
        console.error("KYC fetch error:", e);
        console.error(
          "Token being used:",
          effectiveToken ? "Token exists" : "No token",
        );
        setKycError(
          e instanceof Error ? e.message : "Failed to load KYC documents",
        );
        setKycDocuments([]);
      } finally {
        setKycLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadKYC();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeTab, kycSearch, kycStatusFilter, effectiveToken]);

  // Load auctions when auctions tab is active
  useEffect(() => {
    const loadAuctions = async () => {
      if (activeTab !== "auctions") return;

      setAuctionsLoading(true);
      setAuctionsError(null);
      try {
        let data: LiveAuction[];

        // Priority: search > filter > all
        if (auctionSearch.trim()) {
          data = await searchAuctions(auctionSearch.trim(), effectiveToken);
        } else if (auctionStatusFilter) {
          data = await filterAuctions(auctionStatusFilter, effectiveToken);
        } else {
          data = await getAllAuctions(effectiveToken);
        }

        setAuctions(data || []);
      } catch (e) {
        console.error("Auctions fetch error:", e);
        console.error(
          "Token being used:",
          effectiveToken ? "Token exists" : "No token",
        );
        setAuctionsError(
          e instanceof Error ? e.message : "Failed to load auctions",
        );
        setAuctions([]);
      } finally {
        setAuctionsLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadAuctions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeTab, auctionSearch, auctionStatusFilter, effectiveToken]);

  // Load payments when payments tab is active
  useEffect(() => {
    const loadPayments = async () => {
      if (activeTab !== "payments") return;

      setPaymentsLoading(true);
      setPaymentsError(null);
      try {
        const data = await getPendingPayments(effectiveToken);
        setPayments(data || []);
      } catch (e) {
        console.error("Payments fetch error:", e);
        setPaymentsError(
          e instanceof Error ? e.message : "Failed to load payments",
        );
        setPayments([]);
      } finally {
        setPaymentsLoading(false);
      }
    };

    loadPayments();
  }, [activeTab, effectiveToken]);

  const handleViewVehicleDetails = async (vehicleId: number) => {
    setVehicleDetailsLoadingId(vehicleId);
    try {
      const details = await getVehicleById(vehicleId, effectiveToken);
      if (details) {
        const mergedImages = mergeImageSources(
          details.result,
          details.attributes,
          details.images,
        );
        const override = vehicleCoverOverrides[String(details.id)];
        const defaultIndex = override
          ? Math.max(mergedImages.indexOf(override), 0)
          : 0;
        setSelectedVehicleImageIndex(
          mergedImages.length > 0 ? defaultIndex : 0,
        );
        setSelectedVehicleDetails(details);
        setShowVehicleModal(true);
      } else {
        alert("Vehicle not found");
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load vehicle details",
      );
    } finally {
      setVehicleDetailsLoadingId(null);
    }
  };

  const closeVehicleModal = () => {
    setShowVehicleModal(false);
    setSelectedVehicleDetails(null);
    setSelectedVehicleImageIndex(0);
  };

  const handleSetVehicleCoverImage = (
    vehicleId: number,
    imageUrl: string,
    forcedIndex?: number,
  ) => {
    if (!imageUrl) return;
    const key = String(vehicleId);
    setVehicleCoverOverrides((prev) => {
      const next = { ...prev, [key]: imageUrl };
      persistOverrideMap(VEHICLE_COVER_STORAGE_KEY, next);
      return next;
    });
    if (typeof forcedIndex === "number") {
      setSelectedVehicleImageIndex(forcedIndex);
    }
  };

  const handleSetAuctionCoverImage = (
    auctionId: string,
    imageUrl: string,
    forcedIndex?: number,
  ) => {
    if (!imageUrl) return;
    const key = String(auctionId);
    setAuctionCoverOverrides((prev) => {
      const next = { ...prev, [key]: imageUrl };
      persistOverrideMap(AUCTION_COVER_STORAGE_KEY, next);
      return next;
    });
    if (typeof forcedIndex === "number") {
      setSelectedAuctionImageIndex(forcedIndex);
    }
  };

  const closeAuctionModal = () => {
    setShowAuctionModal(false);
    setSelectedAuction(null);
    setSelectedAuctionImageIndex(0);
  };

  const saveEditedReport = async () => {
      if (
        !inspectionForm ||
        !showInspectionModal.vehicle?.inspection_report
      )
        return;

      // Validate required fields
      const errors: string[] = [];
      const touched = new Set<string>();

      if (!inspectionForm.inspectorId?.trim()) {
        errors.push("Inspector ID is required");
        touched.add("inspectorId");
      }
      if (!inspectionForm.inspectionDate) {
        errors.push("Inspection Date is required");
        touched.add("inspectionDate");
      }
      if (!inspectionForm.locationCity?.trim()) {
        errors.push("Location City is required");
        touched.add("locationCity");
      }
      if (
        !inspectionForm.odometerReading ||
        inspectionForm.odometerReading <= 0
      ) {
        errors.push("Valid Odometer Reading is required");
        touched.add("odometerReading");
      }

      if (errors.length > 0) {
        setInspectionErrors(errors);
        setInspectionTouched(touched);
        return;
      }

      setInspectionErrors([]);
      const res = await editreport(
        showInspectionModal.vehicle.inspection_report,
        inspectionForm,
        effectiveToken,
      );
      if (!res.ok) {
        setInspectionErrors([
          res.message ||
            "Failed to update inspection report",
        ]);
      } else {
        setEditMode(false);
        setInspectionErrors([]);
        setInspectionTouched(new Set());
        // Reload vehicles after editing
        const data = vehicleSearch.trim()
          ? await searchAdminVehicles(
              vehicleSearch.trim(),
              effectiveToken,
            )
          : vehicleStatusFilter
            ? await filterAdminVehicles(
                vehicleStatusFilter,
                effectiveToken,
              )
            : await getAdminVehicles(effectiveToken);
        setVehicles(data);
        showToast("inspection report ready")
      }
    };

  const saveReport=async () => {
    if (!inspectionForm) return;

    // Validate required fields
    const errors: string[] = [];
    const touched = new Set<string>();

    if (!inspectionForm.inspectorId?.trim()) {
      errors.push("Inspector ID is required");
      touched.add("inspectorId");
    }
    if (!inspectionForm.inspectionDate) {
      errors.push("Inspection Date is required");
      touched.add("inspectionDate");
    }
    if (!inspectionForm.locationCity?.trim()) {
      errors.push("Location City is required");
      touched.add("locationCity");
    }
    if (
      !inspectionForm.odometerReading ||
      inspectionForm.odometerReading <= 0
    ) {
      errors.push("Valid Odometer Reading is required");
      touched.add("odometerReading");
    }

    if (errors.length > 0) {
      setInspectionErrors(errors);
      setInspectionTouched(touched);
      return;
    }

    setInspectionErrors([]);
    const res = await createInspectionReport(
      inspectionForm,
      effectiveToken,
    );

    if (!res.ok) {
      setInspectionErrors([
        res.message ||
          "Failed to create inspection report",
      ]);
    } else {
      setShowInspectionModal({ open: false });
      setInspectionErrors([]);
      setInspectionTouched(new Set());
      // Reload vehicles after creating inspection
      const data = vehicleSearch.trim()
        ? await searchAdminVehicles(
            vehicleSearch.trim(),
            effectiveToken,
          )
        : vehicleStatusFilter
          ? await filterAdminVehicles(
              vehicleStatusFilter,
              effectiveToken,
            )
          : await getAdminVehicles(effectiveToken);
      setVehicles(data);
      showToast("inspection report ready", "success");
    }
    
  };
  const handleUpdateVehicleStatus=async (v: any, newStatus: string, effectiveToken: string) => {
    try {
      const res = await updateVehicleStatus(
        v.id,
        newStatus,
        effectiveToken,
      );
      if (!res.ok) {
        showToast(res.message || "Failed to update vehicle status", "error");
      } else {
        // Reload vehicles after status update
        const data = vehicleSearch.trim()
          ? await searchAdminVehicles(
              vehicleSearch.trim(),
              effectiveToken,
            )
          : vehicleStatusFilter
            ? await filterAdminVehicles(
                vehicleStatusFilter,
                effectiveToken,
              )
            : await getAdminVehicles(
                effectiveToken,
              );
        setVehicles(data);
        showToast(`Vehicle status updated to ${newStatus}`, "success");
      }
    } catch (error) {
      showToast("Failed to update vehicle status", "error");
      console.error("Error updating vehicle status:", error);
    }
  };

  const LoadInspectionReportHandler=async (v:any, effectiveToken:string) => {
    if (
      v.inspection_req === 0 &&
      v.inspection_report
    ) {
      // View mode: fetch report data
      try {
        const reportData = await getreport(
          v.inspection_report,
          effectiveToken,
        );
        if (reportData) {
          const report = reportData as any;
          setInspectionForm({
            vehicleId: v.id,
            inspectorId:
              report.inspectorId || "",
            inspectionDate:
              report.inspectionDate
                ? new Date(
                    report.inspectionDate,
                  )
                    .toISOString()
                    .slice(0, 10)
                : new Date()
                    .toISOString()
                    .slice(0, 10),
            locationCity:
              report.locationCity ||
              v.location ||
              "",
            odometerReading:
              report.odometerReading ||
              v.milage ||
              0,
            overallCondition:
              report.overallCondition || "good",
            engineCond:
              report.engineCond || "good",
            transmissionCond:
              report.transmissionCond || "good",
            suspensionCond:
              report.suspensionCond || "good",
            interiorCond:
              report.interiorCond || "good",
            paintCond:
              report.paintCond || "good",
            inspectorNotes:
              report.inspectorNotes || "",
            photosUrl: report.photosUrl || [],
            accidentHistory:
              report.accidentHistory || "",
            mechanicalIssues:
              report.mechanicalIssues || "",
            requiredRepairs:
              report.requiredRepairs || "",
            estimatedRepairCost:
              report.estimatedRepairCost,
            reportDocUrl:
              report.reportDocUrl || "",
            status: report.status || "pending",
          });
          setShowInspectionModal({
            open: true,
            vehicle: v,
            viewMode: true,
          });
        }
      } catch (error) {
        console.error(
          "Failed to fetch report:",
          error,
        );
        showToast("Failed to load inspection report","error");
      }
    } else {
      // Create mode
      setShowInspectionModal({
        open: true,
        vehicle: v,
        viewMode: false,
      });
      setInspectionForm({
        vehicleId: v.id,
        inspectorId: "",
        inspectionDate: new Date()
          .toISOString()
          .slice(0, 10),
        locationCity: v.location || "",
        odometerReading: v.milage || 0,
        overallCondition: "good",
        engineCond: "good",
        transmissionCond: "good",
        suspensionCond: "good",
        interiorCond: "good",
        paintCond: "good",
        inspectorNotes: "",
        photosUrl: [],
        status: "pending",
      });
    }
  };

  const refreshAuctions = useCallback(async () => {
    let data: LiveAuction[] | undefined;
    const trimmedQuery = auctionSearch.trim();

    if (trimmedQuery) {
      data = await searchAuctions(trimmedQuery, effectiveToken);
    } else if (auctionStatusFilter) {
      data = await filterAuctions(auctionStatusFilter, effectiveToken);
    } else {
      data = await getAllAuctions(effectiveToken);
    }

    setAuctions(data || []);
  }, [auctionSearch, auctionStatusFilter, effectiveToken]);

  const handleKycStatusChange = useCallback(
    async (doc: KYCDocument, newStatus: string) => {
      const userId = doc.id || doc.userId;
      if (!userId) {
        showToast("No user ID found", "error");
        return;
      }

      try {
        const result = await updateKYC(
          userId,
          { status: newStatus },
          effectiveToken,
        );
        if (result.ok) {
          const data = await getPendingKYC(effectiveToken);
          setKycDocuments(data || []);
          showToast(`KYC status updated to ${newStatus}`, "success");
        } else {
          showToast(result.message || "Failed to update status", "error");
        }
      } catch (error) {
        console.error("Failed to update KYC status:", error);
        showToast("Failed to update status", "error");
      }
    },
    [effectiveToken, showToast],
  );

  const handleViewKycDetails = useCallback(
    async (doc: KYCDocument) => {
      const userId = doc.id || doc.userId;
      if (!userId) {
        showToast("No user ID found", "error");
        return;
      }

      try {
        const userDetails = await viewuser(userId, effectiveToken);
        if (userDetails) {
          setSelectedKYC({
            ...doc,
            ...userDetails,
            isActive:
              typeof userDetails.isActive === "string"
                ? parseInt(userDetails.isActive, 10)
                : userDetails.isActive,
            isBanned:
              typeof userDetails.isBanned === "string"
                ? parseInt(userDetails.isBanned, 10)
                : userDetails.isBanned,
          });
          setShowKYCModal(true);
        } else {
          showToast("No user details found", "warning");
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        showToast(
          error instanceof Error
            ? error.message
            : "Error fetching user details",
          "error",
        );
      }
    },
    [effectiveToken, showToast],
  );

  const handleAuctionStatusChange = useCallback(
    async (auctionId: string, newStatus: string) => {
      try {
        const res = await updateAuctionStatus(
          auctionId,
          newStatus,
          effectiveToken,
        );
        if (res.ok) {
          await refreshAuctions();
          showToast(`Auction status updated to ${newStatus}`, "success");
        } else {
          showToast(res.message || "Failed to update status", "error");
        }
      } catch (error) {
        console.error("Failed to update auction status:", error);
        showToast("Failed to update status", "error");
      }
    },
    [effectiveToken, refreshAuctions, showToast],
  );

  const handleConfirmAuctionStartTime = useCallback(
    async (auctionId: string) => {
      if (!editingAuction) return;

      try {
        const localDate = new Date(editingAuction.value);
        if (Number.isNaN(localDate.getTime())) {
          showToast("Invalid start time", "warning");
          return;
        }

        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, "0");
        const day = String(localDate.getDate()).padStart(2, "0");
        const hours = String(localDate.getHours()).padStart(2, "0");
        const minutes = String(localDate.getMinutes()).padStart(2, "0");
        const seconds = String(localDate.getSeconds()).padStart(2, "0");
        const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const res = await setAuctionStartTime(
          auctionId,
          formattedTime,
          effectiveToken,
        );

        if (res.ok) {
          await refreshAuctions();
          setEditingAuction(null);
          showToast(`Start time updated to be ${formattedTime}`, "success");
        } else {
          showToast(res.message || "Failed to update start time", "error");
        }
      } catch (error) {
        console.error("Failed to update start time:", error);
        showToast("Failed to update start time", "error");
      }
    },
    [editingAuction, effectiveToken, refreshAuctions, showToast],
  );

  const handleOpenAuctionDetails = useCallback(
    async (auctionId: string) => {
      try {
        const auctionDetails = await getAuctionById(
          auctionId,
          effectiveToken,
        );
        if (auctionDetails) {
          const mergedImages = mergeImageSources(
            auctionDetails.vehicleImages,
            auctionDetails.result?.vehicleImages,
            auctionDetails.result,
          );
          const override = auctionCoverOverrides[String(auctionDetails.id)];
          const defaultIndex =
            override && mergedImages.includes(override)
              ? mergedImages.indexOf(override)
              : 0;
          setSelectedAuctionImageIndex(
            mergedImages.length > 0 ? defaultIndex : 0,
          );
          setSelectedAuction(auctionDetails);
          setShowAuctionModal(true);
        } else {
          showToast("No auction details found", "warning");
        }
      } catch (error) {
        console.error("Failed to load auction details:", error);
        showToast("Failed to load auction details", "error");
      }
    },
    [auctionCoverOverrides, effectiveToken, showToast],
  );

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Admin Control Center
            </h1>
            <p className="text-slate-500 mt-1">
              Monitor platform health and handle user verifications.
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              to="/admin/users"
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
            >
              User Moderation
            </Link>
            <Link
              to="/admin/finance/revenue"
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Revenue Dashboard
            </Link>

            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all">
              <BarChart3 size={18} />
              Platform Metrics
            </button>
          </div>
        </div>

        {/* Priority Queues */}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div
            className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 flex items-center gap-4 premium-card-hover cursor-pointer"
            onClick={() => {
              setActiveTab("vehicles");
              tabsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
           <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Vehicles
              </p>
              
              <p className="text-[10px] text-amber-600 font-bold mt-1">
                
              </p>
            </div>
          </div>
          <div
            className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 flex items-center gap-4 premium-card-hover cursor-pointer"
            onClick={() => {
              setActiveTab("kyc");
              tabsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Pending KYC
              </p>
              {/* <h3 className="text-2xl font-black text-slate-900">24</h3>
              <p className="text-[10px] text-indigo-600 font-bold mt-1">
                4 Urgent
              </p> */}
            </div>
          </div>
          <div
            className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200 flex items-center gap-4 premium-card-hover cursor-pointer"
            onClick={() => {
              setActiveTab("auctions");
              tabsRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Live Auctions
              </p>
              {/* <h3 className="text-2xl font-black text-slate-900">12</h3>
              <p className="text-[10px] text-amber-600 font-bold mt-1">
                2 New Claims
              </p> */}
            </div>
          </div>
          
        </div>

        {/* Requirements Snapshot */}
        <div className="bg-white/95 rounded-3xl p-8 shadow-sm border border-slate-200 mb-12 premium-card-hover">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Requirements Overview
              </p>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                User Journey Coverage
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Track critical flows across authentication, KYC, listings,
                auctions, and payments.
              </p>
            </div>
            <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
              Review Roadmap
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                title: "Authentication & Access",
                detail: "Register, login, reset, logout, session history",
                status: "In Progress",
              },
              {
                title: "User Profile & Verification",
                detail: "Profile updates, phone/email verification, location",
                status: "Planned",
              },
              {
                title: "KYC & Compliance",
                detail: "Document + selfie capture, review queue, approvals",
                status: "Active",
              },
              {
                title: "Listings, Auctions & Payments",
                detail: "Listing lifecycle, bids, escrow, payments, disputes",
                status: "Active",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl p-4 bg-slate-50"
              >
                <p className="text-xs font-bold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {item.detail}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 mt-4">
                  <ArrowUpRight size={12} />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="bg-white/95 rounded-3xl shadow-sm border border-slate-200 overflow-hidden premium-card-hover"
          ref={tabsRef}
        >
          {/* Tabs */}
          <div className="px-8 pt-6 border-b border-slate-100">
            <div className="flex gap-8">
              {["vehicles", "kyc", "auctions", "payments"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-full transition-all ${activeTab === tab ? "bg-indigo-600 text-white" : "bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === "vehicles" && (
              <div className="overflow-x-auto">
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                  <div className="relative flex-grow">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="text"
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      placeholder="Search by make, model, or location..."
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-500" />
                    <select
                      value={vehicleStatusFilter}
                      onChange={(e) => setVehicleStatusFilter(e.target.value)}
                      className="px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <option value="">All statuses</option>
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="sold">sold</option>
                      <option value="delisted">delisted</option>
                    </select>
                  </div>
                </div>

                <table className="w-full">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Photo
                      </th>
                      <th className="px-4 py-4 w-[220px] text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Vehicle
                      </th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Type
                      </th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Inspection
                      </th>
                      <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleLoading && (
                      <tr>
                        <td className="px-4 py-6" colSpan={6}>
                          Loading vehicles…
                        </td>
                      </tr>
                    )}
                    {vehicleError && !vehicleLoading && (
                      <tr>
                        <td className="px-4 py-6 text-rose-600" colSpan={6}>
                          {vehicleError}
                        </td>
                      </tr>
                    )}
                    {!vehicleLoading &&
                      !vehicleError &&
                      vehicles.length === 0 && (
                        <tr>
                          <td className="px-4 py-6 text-slate-500" colSpan={6}>
                            No vehicles found.
                          </td>
                        </tr>
                      )}
                    {!vehicleLoading &&
                      !vehicleError &&
                      vehicles.map((v) => {
                        const canEditStatus =
                          v.inspection_req === 0 ||
                          Boolean(v.inspection_report);
                        const inspectionDone = Boolean(v.inspection_report);
                        const statusValue = String(v.status ?? '').toLowerCase();
                        const statusBadge =
                          statusValue === 'active'
                            ? {
                                label: 'APPROVED',
                                border: 'border-emerald-500',
                                text: 'text-emerald-600',
                                accent: 'bg-emerald-100/80',
                              }
                            : statusValue === 'sold'
                              ? {
                                  label: 'SOLD',
                                  subtext: 'NO LONGER AVAILABLE',
                                  border: 'border-slate-900',
                                  text: 'text-slate-900',
                                  accent: 'bg-slate-100/80',
                                }
                              : statusValue === 'delisted'
                                ? {
                                    label: 'REJECTED',
                                    border: 'border-rose-600',
                                    text: 'text-rose-600',
                                    accent: 'bg-rose-100/80',
                                  }
                                : null;
                        const vehicleCoverOverride =
                          vehicleCoverOverrides[String(v.id)];
                        const vehicleImageSrc =
                          vehicleCoverOverride ||
                          pickPrimaryImage(
                            v.result,
                            v.attributes,
                            v.images,
                          );
                        return (
                          <tr
                            key={v.id}
                            className="hover:bg-slate-50/50 transition-all group"
                          >
                            <td className="px-4 py-6">
                              <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                                {statusBadge && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                    <div
                                      className={`w-16 h-16 rounded-full border-[3px] ${statusBadge.border} ${statusBadge.text} drop-shadow flex items-center justify-center bg-white/80 backdrop-blur-sm relative`}
                                      style={{ transform: 'rotate(-12deg)' }}
                                    >
                                      <div className={`absolute inset-1 rounded-full ${statusBadge.accent} opacity-70 z-0 pointer-events-none`} />
                                      <div className={`w-14 h-14 rounded-full border border-dashed ${statusBadge.border} z-10 flex items-center justify-center`}>
                                        <div className={`w-full h-full rounded-full flex flex-col items-center justify-center text-[8px] font-black uppercase tracking-[0.15em] ${statusBadge.text}`}>
                                          <span>{statusBadge.label}</span>
                                          <span className={`text-[6px] tracking-[0.2em] mt-0.5 font-semibold ${statusBadge.text}`}>
                                            {statusBadge.subtext}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {vehicleImageSrc ? (
                                  <img
                                    src={vehicleImageSrc}
                                    alt={`${v.make} ${v.model}`}
                                    className="w-full h-full object-cover z-0"
                                    loading="lazy"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                      (
                                        e.target as HTMLImageElement
                                      ).parentElement!.innerHTML =
                                        '<span class="text-slate-400 text-xs">No Image</span>';
                                    }}
                                  />
                                ) : (
                                  <span className="text-slate-400 text-xs">No Image</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-6">
                              <p className="font-bold text-slate-900">
                                {v.make} {v.model} {v.year}
                              </p>
                              <p className="text-xs text-slate-400">
                                VIN: {v.vin || "—"} · Plate:{" "}
                                {v.plate_number || "—"}
                              </p>
                            </td>
                            <td className="px-4 py-6">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  v.sale_type === "auction"
                                    ? "bg-violet-50 text-violet-600"
                                    : "bg-emerald-50 text-emerald-600"
                                }`}
                              >
                                {v.sale_type === "auction"
                                  ? "Auction"
                                  : "Fixed Price"}
                              </span>
                            </td>
                            <td className="px-4 py-6">
                              <select
                                disabled={!canEditStatus}
                                value={String(v.status).toLowerCase()}
                                className={`px-2.5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider border ${canEditStatus ? "bg-white border-slate-200 text-slate-900" : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"}`}
                                onChange={(e) => handleUpdateVehicleStatus(v, e.target.value, effectiveToken)}
                              >
                                <option value="active">active</option>
                                <option value="draft">draft</option>
                                <option value="sold">sold</option>
                                <option value="delisted">delisted</option>
                              </select>
                            </td>
                            <td className="px-4 py-6">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${inspectionDone ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                              >
                                {inspectionDone
                                  ? "Report Ready"
                                  : v.inspection_req === 1
                                    ? "Required"
                                    : "Done"}
                              </span>
                            </td>
                            <td className="px-4 py-6">
                              <div className="flex items-center gap-3">
                                <button
                                  className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
                                  onClick={() => LoadInspectionReportHandler(v, effectiveToken)}
                                >
                                  {v.inspection_req === 0
                                    ? "View Report"
                                    : "Make Inspection Report"}
                                </button>
                                <button
                                  className={`ml-auto p-2 rounded-lg transition-all ${vehicleDetailsLoadingId === v.id ? "text-slate-300 cursor-wait" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"}`}
                                  title="View details"
                                  disabled={vehicleDetailsLoadingId === v.id}
                                  onClick={() => handleViewVehicleDetails(v.id)}
                                >
                                  <ArrowUpRight size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "kyc" && (
              <div>
                {/* Search and Filter Bar */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search KYC by name, email, phone..."
                        value={kycSearch}
                        onChange={(e) => setKycSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative min-w-[200px]">
                      <Filter
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <select
                        value={kycStatusFilter}
                        onChange={(e) => setKycStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                      >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {kycLoading && (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  )}

                  {!kycLoading && kycError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                      {kycError}
                    </div>
                  )}

                  {!kycLoading && !kycError && (
                    <table className="w-full">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            User
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Role
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            KYC Document
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Status
                          </th>
                          <th className="px-4 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {kycDocuments && kycDocuments.length > 0 ? (
                          kycDocuments.map((doc, index) => {
                            const firstName = doc.firstName || "N/A";
                            const lastName = doc.lastName || "";
                            const email = doc.email || "N/A";
                            const role = doc.role || "user";
                            const status = doc.kycStatus || "pending";
                            const documentUrl =
                              doc.kycDocumentUrl ||
                              doc.documentFrontUrl ||
                              doc.documentBackUrl ||
                              doc.selfieWithDocUrl;

                            return (
                              <tr
                                key={doc.kycId || doc.userId || `kyc-${index}`}
                                className="hover:bg-slate-50/50 transition-all group"
                              >
                                <td className="px-4 py-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                      {firstName[0]?.toUpperCase() || "U"}
                                      {lastName[0]?.toUpperCase() || ""}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900">
                                        {firstName} {lastName}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {email}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-6">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                      role === "admin"
                                        ? "bg-purple-50 text-purple-600"
                                        : role === "seller"
                                          ? "bg-blue-50 text-blue-600"
                                          : "bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    {role}
                                  </span>
                                </td>
                                <td className="px-4 py-6">
                                  {documentUrl ? (
                                    <a
                                      href={documentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 transition-all"
                                    >
                                      <Download size={14} />
                                      View Document
                                    </a>
                                  ) : (
                                    <span className="text-sm text-slate-400">
                                      No document
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-6">
                                  <select
                                    value={status}
                                    disabled={!documentUrl}
                                    onChange={(e) =>
                                      handleKycStatusChange(
                                        doc,
                                        e.target.value,
                                      )
                                    }
                                    className={`px-2.5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider border ${
                                      !documentUrl
                                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                        : "bg-white border-slate-200 text-slate-900"
                                    }`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                </td>
                                <td className="px-4 py-6 text-right">
                                  <button
                                    className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
                                    title="View details"
                                    onClick={() => handleViewKycDetails(doc)}
                                  >
                                    <ArrowUpRight size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-12 text-center text-slate-400"
                            >
                              No pending KYC documents
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {activeTab === "auctions" && (
              <div>
                {/* Search and Filter Bar */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="Search auctions by seller, vehicle, status..."
                        value={auctionSearch}
                        onChange={(e) => setAuctionSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative min-w-[200px]">
                      <Filter
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <select
                        value={auctionStatusFilter}
                        onChange={(e) => setAuctionStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                      >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="live">Live</option>
                        <option value="ended">Ended</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {auctionsLoading && (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  )}

                  {!auctionsLoading && auctionsError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                      {auctionsError}
                    </div>
                  )}

                  {!auctionsLoading && !auctionsError && (
                    <table className="w-full">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Photo
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Vehicle
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Seller
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Status
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Start Time
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Current Bid
                          </th>
                          <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            End Time
                          </th>
                          <th className="px-4 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auctions && auctions.length > 0 ? (
                          auctions.map((auction, index) => {
                            const sellerName = auction.sellerName || "N/A";
                            const vehicleName =
                              auction.vehicleMake &&
                              auction.vehicleModel &&
                              auction.vehicleYear
                                ? `${auction.vehicleMake} ${auction.vehicleModel} ${auction.vehicleYear}`
                                : "N/A";
                            const status = auction.status || "draft";
                            const startTime = auction.startTime
                              ? new Date(auction.startTime).toLocaleString()
                              : "N/A";
                            const currentBid = auction.currentBid
                              ? `${auction.currentBid.toLocaleString()} EGP`
                              : "No bids";
                            const endTime = auction.endTime
                              ? new Date(auction.endTime).toLocaleString()
                              : "N/A";
                            const isEditingStartTime =
                              editingAuction?.id === auction.id &&
                              editingAuction?.field === "startTime";
                            const auctionCoverOverride =
                              auctionCoverOverrides[String(auction.id)];
                            const auctionImageSrc =
                              auctionCoverOverride ||
                              pickPrimaryImage(
                                auction.result?.vehicleImages,
                                auction.result,
                                auction.vehicleImages,
                              );
                            const auctionStatusValue = status.toLowerCase();
                            const auctionStatusBadge =
                              auctionStatusValue === 'live'
                                ? {
                                    label: 'LIVE',
                                    subtext: 'BIDDING NOW',
                                    border: 'border-emerald-500',
                                    text: 'text-emerald-600',
                                    accent: 'bg-emerald-100/80',
                                  }
                                : auctionStatusValue === 'ended'
                                  ? {
                                      label: 'ENDED',
                                      subtext: 'CLOSED SALE',
                                      border: 'border-slate-700',
                                      text: 'text-slate-800',
                                      accent: 'bg-slate-100/80',
                                    }
                                  : auctionStatusValue === 'cancelled'
                                    ? {
                                        label: 'VOID',
                                        subtext: 'ADMIN HOLD',
                                        border: 'border-rose-600',
                                        text: 'text-rose-600',
                                        accent: 'bg-rose-100/80',
                                      }
                                    : auctionStatusValue === 'scheduled'
                                      ? {
                                          label: 'SET',
                                          border: 'border-indigo-500',
                                          text: 'text-indigo-600',
                                          accent: 'bg-indigo-100/80',
                                        }
                                      : auctionStatusValue === 'draft'
                                        ? {
                                            label: 'DRAFT',
                                            subtext: 'IN REVIEW',
                                            border: 'border-amber-500',
                                            text: 'text-amber-600',
                                            accent: 'bg-amber-100/80',
                                          }
                                        : null;

                            return (
                              <tr
                                key={auction.id || `auction-${index}`}
                                className="hover:bg-slate-50/50 transition-all group"
                              >
                                <td className="px-4 py-6">
                                  <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                                    {auctionStatusBadge && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                        <div
                                          className={`w-16 h-16 rounded-full border-[3px] ${auctionStatusBadge.border} ${auctionStatusBadge.text} drop-shadow flex items-center justify-center bg-white/80 backdrop-blur-sm relative`}
                                          style={{ transform: 'rotate(-12deg)' }}
                                        >
                                          <div className={`absolute inset-1 rounded-full ${auctionStatusBadge.accent} opacity-70 z-0 pointer-events-none`} />
                                          <div className={`w-14 h-14 rounded-full border border-dashed ${auctionStatusBadge.border} z-10 flex items-center justify-center`}>
                                            <div className={`w-full h-full rounded-full flex flex-col items-center justify-center text-[8px] font-black uppercase tracking-[0.15em] ${auctionStatusBadge.text}`}>
                                              <span>{auctionStatusBadge.label}</span>
                                              <span className={`text-[6px] tracking-[0.2em] mt-0.5 font-semibold ${auctionStatusBadge.text}`}>
                                                {auctionStatusBadge.subtext}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {auctionImageSrc ? (
                                      <img
                                        src={auctionImageSrc}
                                        alt={vehicleName}
                                        className="w-full h-full object-cover z-0"
                                        loading="lazy"
                                        onError={(e) => {
                                          (
                                            e.target as HTMLImageElement
                                          ).style.display = "none";
                                          (
                                            e.target as HTMLImageElement
                                          ).parentElement!.innerHTML =
                                            '<span class="text-slate-400 text-xs">No Image</span>';
                                        }}
                                      />
                                    ) : (
                                      <span className="text-slate-400 text-xs">No Image</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-6">
                                  <p className="font-bold text-slate-900">
                                    {vehicleName}
                                  </p>
                                </td>
                                <td className="px-4 py-6 text-sm text-slate-900">
                                  {sellerName}
                                </td>
                                <td className="px-4 py-6">
                                  <select
                                    value={status}
                                    className="px-2.5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider border bg-white border-slate-200 text-slate-900"
                                    onChange={(e) =>
                                      handleAuctionStatusChange(
                                        auction.id,
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value="draft">Draft</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="live">Live</option>
                                    <option value="ended">Ended</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </td>
                                <td className="px-4 py-6">
                                  {isEditingStartTime ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="datetime-local"
                                        value={editingAuction.value}
                                        onChange={(e) =>
                                          setEditingAuction({
                                            ...editingAuction,
                                            value: e.target.value,
                                          })
                                        }
                                        className="border border-indigo-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                      <button
                                        onClick={() =>
                                          handleConfirmAuctionStartTime(
                                            auction.id,
                                          )
                                        }
                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                      >
                                        <CheckCircle size={16} />
                                      </button>
                                      <button
                                        onClick={() => setEditingAuction(null)}
                                        className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                      >
                                        <XCircle size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        // Convert database timestamp to local datetime-local format (YYYY-MM-DDTHH:mm)
                                        let localTimeStr;
                                        if (auction.startTime) {
                                          const date = new Date(
                                            auction.startTime,
                                          );
                                          const year = date.getFullYear();
                                          const month = String(
                                            date.getMonth() + 1,
                                          ).padStart(2, "0");
                                          const day = String(
                                            date.getDate(),
                                          ).padStart(2, "0");
                                          const hours = String(
                                            date.getHours(),
                                          ).padStart(2, "0");
                                          const minutes = String(
                                            date.getMinutes(),
                                          ).padStart(2, "0");
                                          localTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
                                        } else {
                                          const date = new Date();
                                          const year = date.getFullYear();
                                          const month = String(
                                            date.getMonth() + 1,
                                          ).padStart(2, "0");
                                          const day = String(
                                            date.getDate(),
                                          ).padStart(2, "0");
                                          const hours = String(
                                            date.getHours(),
                                          ).padStart(2, "0");
                                          const minutes = String(
                                            date.getMinutes(),
                                          ).padStart(2, "0");
                                          localTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
                                        }
                                        setEditingAuction({
                                          id: auction.id,
                                          field: "startTime",
                                          value: localTimeStr,
                                        });
                                      }}
                                      className="text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-all"
                                    >
                                      {startTime}
                                    </button>
                                  )}
                                </td>
                                <td className="px-4 py-6 text-sm font-bold text-slate-900">
                                  {currentBid}
                                </td>
                                <td className="px-4 py-6 text-sm text-slate-500">
                                  {endTime}
                                </td>
                                <td className="px-4 py-6 text-right">
                                  <button
                                    className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
                                    title="View details"
                                    onClick={() => handleOpenAuctionDetails(auction.id)}
                                  >
                                    <ArrowUpRight size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-12 text-center text-slate-400"
                            >
                              No auctions found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="overflow-x-auto">
                {paymentsLoading && (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}

                {!paymentsLoading && paymentsError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                    {paymentsError}
                  </div>
                )}

                {!paymentsLoading && !paymentsError && (
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Payment ID
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Buyer
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Amount
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Status
                        </th>
                        <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Initiated
                        </th>
                        <th className="px-4 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments && payments.length > 0 ? (
                        payments.map((payment, index) => {
                          const paymentId = payment.id || "N/A";
                          const buyerName = payment.buyerName || "N/A";
                          const amount = payment.amount
                            ? `${payment.amount.toLocaleString()} ${payment.currency || "EGP"}`
                            : "N/A";
                          const status = payment.status || "N/A";
                          const initiated = payment.initiatedAt
                            ? new Date(payment.initiatedAt).toLocaleString()
                            : "N/A";

                          return (
                            <tr
                              key={payment.id || `payment-${index}`}
                              className="hover:bg-slate-50/50 transition-all group"
                            >
                              <td className="px-4 py-6 text-sm font-mono text-slate-600">
                                {paymentId}
                              </td>
                              <td className="px-4 py-6 text-sm text-slate-900">
                                {buyerName}
                              </td>
                              <td className="px-4 py-6 text-sm font-bold text-slate-900">
                                {amount}
                              </td>
                              <td className="px-4 py-6">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                    status === "pending"
                                      ? "bg-amber-50 text-amber-600"
                                      : status === "completed"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : status === "failed"
                                          ? "bg-rose-50 text-rose-600"
                                          : "bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-6 text-sm text-slate-500">
                                {initiated}
                              </td>
                              <td className="px-4 py-6 text-right">
                                <button
                                  className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
                                  title="View details"
                                >
                                  <ArrowUpRight size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-12 text-center text-slate-400"
                          >
                            No pending payments
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Details Modal */}
        {showVehicleModal && selectedVehicleDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between rounded-t-3xl">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                    Vehicle Details
                  </p>
                  <h3 className="text-2xl font-black text-slate-900">
                    {selectedVehicleDetails.make} {selectedVehicleDetails.model}{" "}
                    {selectedVehicleDetails.year}
                  </h3>
                  <p className="text-sm text-slate-500 font-mono">
                    Listing #{selectedVehicleDetails.id}
                  </p>
                </div>
                <button
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                  onClick={closeVehicleModal}
                  aria-label="Close vehicle details"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto max-h-[calc(100vh-220px)] p-8 space-y-8">
                <div className="space-y-4">
                  <div className="relative w-full h-80 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
                    {activeVehicleImage ? (
                      <>
                        <img
                          src={activeVehicleImage}
                          alt={`${selectedVehicleDetails.make} ${selectedVehicleDetails.model}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (
                              e.target as HTMLImageElement
                            ).parentElement!.innerHTML =
                              '<div class="flex flex-col items-center justify-center text-slate-400 gap-2"><svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" /></svg><span class="text-xs font-semibold">No photo available</span></div>';
                          }}
                        />
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/80 backdrop-blur text-[11px] font-semibold text-slate-700 border border-white/70">
                          Image {selectedVehicleImageIndex + 1} / {vehicleGalleryImages.length}
                        </div>
                        <button
                          type="button"
                          className={`absolute top-4 right-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            activeVehicleIsCover
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white/85 text-slate-700 border-white"
                          }`}
                          onClick={() =>
                            handleSetVehicleCoverImage(
                              selectedVehicleDetails.id,
                              activeVehicleImage,
                              selectedVehicleImageIndex,
                            )
                          }
                        >
                          {activeVehicleIsCover ? "Profile photo" : "Set as profile"}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                        <svg
                          className="w-12 h-12"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m2-2l1.586-1.586a2 2 0 012.828 0L22 14M7 8h.01M17 8h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs font-semibold">No photo uploaded</span>
                      </div>
                    )}
                  </div>

                  {vehicleGalleryImages.length > 1 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {vehicleGalleryImages.map((image, index) => {
                        const isActive = index === selectedVehicleImageIndex;
                        const isCover =
                          vehicleCoverOverrides[String(selectedVehicleDetails.id)] ===
                          image;
                        return (
                          <div
                            key={`${selectedVehicleDetails.id}-thumb-${index}`}
                            className="space-y-1.5"
                          >
                            <button
                              type="button"
                              className={`group relative block w-full rounded-2xl border ${
                                isActive
                                  ? "border-slate-900 ring-2 ring-slate-900/20"
                                  : "border-slate-200 hover:border-slate-400"
                              } overflow-hidden bg-white shadow-sm`}
                              onClick={() => setSelectedVehicleImageIndex(index)}
                            >
                              <div className="aspect-square w-full overflow-hidden">
                                <img
                                  src={image}
                                  alt={`Vehicle thumbnail ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                {isActive && (
                                  <div className="absolute inset-0 border-2 border-white/80 pointer-events-none" />
                                )}
                              </div>
                            </button>
                            <div className="flex items-center justify-between px-1.5 text-[10px] font-semibold text-slate-600">
                              <span>{isActive ? "Viewing" : "Preview"}</span>
                              <button
                                type="button"
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isCover ? "text-emerald-600" : "text-slate-500"
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSetVehicleCoverImage(
                                    selectedVehicleDetails.id,
                                    image,
                                    index,
                                  );
                                }}
                              >
                                {isCover ? "Profile" : "Make profile"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${vehicleStatusChipClass}`}
                    >
                      {selectedVehicleDetails.status}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-[0.2em] border border-indigo-100">
                      {selectedVehicleDetails.sale_type === "auction"
                        ? "Auction"
                        : selectedVehicleDetails.sale_type === "fixed_price"
                          ? "Fixed Price"
                          : "N/A"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                    <div>
                      <p className="text-xs uppercase text-slate-400 tracking-widest mb-1">
                        Mileage
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {selectedVehicleDetails.milage
                          ? `${selectedVehicleDetails.milage.toLocaleString()} km`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400 tracking-widest mb-1">
                        Price
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {selectedVehicleDetails.price
                          ? `${selectedVehicleDetails.price.toLocaleString()} ${selectedVehicleDetails.currency || "EGP"}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400 tracking-widest mb-1">
                        Location
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {selectedVehicleDetails.location || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {vehicleSpecEntries.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicleSpecEntries.map((spec) => (
                      <div
                        key={spec.label}
                        className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
                      >
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {spec.label}
                        </p>
                        <p className="text-base font-semibold text-slate-900 mt-1 break-words">
                          {spec.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Seller
                    </p>
                    <h4 className="text-xl font-black text-slate-900 mb-1">
                      {selectedVehicleDetails.seller_name || "Unknown Seller"}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      ID: {selectedVehicleDetails.sellerId ?? "—"}
                    </p>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      {selectedVehicleDetails.seller_email && (
                        <p>Email: {selectedVehicleDetails.seller_email}</p>
                      )}
                      {selectedVehicleDetails.seller_phone && (
                        <p>Phone: {selectedVehicleDetails.seller_phone}</p>
                      )}
                      {selectedVehicleDetails.seller_location && (
                        <p>Location: {selectedVehicleDetails.seller_location}</p>
                      )}
                    </div>
                    {selectedVehicleDetails.seller_bio && (
                      <p className="mt-4 text-xs italic text-slate-500">
                        “{selectedVehicleDetails.seller_bio}”
                      </p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-6 border border-indigo-100 shadow-sm">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">
                      Listing Timeline
                    </p>
                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex justify-between gap-4">
                        <span>Created</span>
                        <span className="font-semibold text-slate-900">
                          {formatDateTime(selectedVehicleDetails.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Updated</span>
                        <span className="font-semibold text-slate-900">
                          {formatDateTime(selectedVehicleDetails.updatedAt)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between gap-4">
                        <span>Inspection</span>
                        <span className="font-semibold text-slate-900">
                          {selectedVehicleDetails.inspection_req === 1
                            ? "Required"
                            : "Done"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Report</span>
                        <span className="font-semibold text-slate-900">
                          {selectedVehicleDetails.inspection_report
                            ? "Available"
                            : "Not submitted"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedVehicleDetails.description && (
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Description
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedVehicleDetails.description}
                    </p>
                  </div>
                )}

                {vehicleFeatureList.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Features
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {vehicleFeatureList.map((feature) => (
                        <span
                          key={feature}
                          className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
                <button
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                  onClick={closeVehicleModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auction Details Modal */}
        {showAuctionModal && selectedAuction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8">
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between rounded-t-3xl bg-white">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                    Auction Details
                  </p>
                  <h3 className="text-2xl font-black text-slate-900">
                    Auction #{selectedAuction.id}
                  </h3>
                </div>
                <button
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                  onClick={closeAuctionModal}
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-200px)] p-8">
                {/* Vehicle Photo */}
                <div className="mb-8 space-y-4">
                  <div className="relative w-full h-80 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner">
                    {activeAuctionImage ? (
                      <>
                        <img
                          src={activeAuctionImage}
                          alt={
                            selectedAuction.vehicleMake &&
                            selectedAuction.vehicleModel
                              ? `${selectedAuction.vehicleMake} ${selectedAuction.vehicleModel}`
                              : "Vehicle"
                          }
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/85 backdrop-blur text-[11px] font-semibold text-slate-700 border border-white/70">
                          Image {selectedAuctionImageIndex + 1} / {auctionGalleryImages.length}
                        </div>
                        <button
                          type="button"
                          className={`absolute top-4 right-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                            activeAuctionIsCover
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white/85 text-slate-700 border-white"
                          }`}
                          onClick={() =>
                            handleSetAuctionCoverImage(
                              selectedAuction.id,
                              activeAuctionImage,
                              selectedAuctionImageIndex,
                            )
                          }
                        >
                          {activeAuctionIsCover ? "Profile photo" : "Set as profile"}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                        <svg
                          className="w-12 h-12"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m2-2l1.586-1.586a2 2 0 012.828 0L22 14M7 8h.01M17 8h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs font-semibold">No photo available</span>
                      </div>
                    )}
                  </div>

                  {auctionGalleryImages.length > 1 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {auctionGalleryImages.map((image, index) => {
                        const isActive = index === selectedAuctionImageIndex;
                        const isCover =
                          auctionCoverOverrides[String(selectedAuction.id)] ===
                          image;
                        return (
                          <div
                            key={`${selectedAuction.id}-auction-thumb-${index}`}
                            className="space-y-1.5"
                          >
                            <button
                              type="button"
                              className={`group relative block w-full rounded-2xl border ${
                                isActive
                                  ? "border-slate-900 ring-2 ring-slate-900/20"
                                  : "border-slate-200 hover:border-slate-400"
                              } overflow-hidden bg-white shadow-sm`}
                              onClick={() => setSelectedAuctionImageIndex(index)}
                            >
                              <div className="aspect-square w-full overflow-hidden">
                                <img
                                  src={image}
                                  alt={`Auction thumbnail ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                {isActive && (
                                  <div className="absolute inset-0 border-2 border-white/80 pointer-events-none" />
                                )}
                              </div>
                            </button>
                            <div className="flex items-center justify-between px-1.5 text-[10px] font-semibold text-slate-600">
                              <span>{isActive ? "Viewing" : "Preview"}</span>
                              <button
                                type="button"
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isCover ? "text-emerald-600" : "text-slate-500"
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleSetAuctionCoverImage(
                                    selectedAuction.id,
                                    image,
                                    index,
                                  );
                                }}
                              >
                                {isCover ? "Profile" : "Make profile"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Vehicle Info Card */}
                <div className="mb-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Vehicle
                      </p>
                      <h4 className="text-3xl font-black text-slate-900">
                        {selectedAuction.vehicleMake &&
                        selectedAuction.vehicleModel &&
                        selectedAuction.vehicleYear
                          ? `${selectedAuction.vehicleMake} ${selectedAuction.vehicleModel} ${selectedAuction.vehicleYear}`
                          : "N/A"}
                      </h4>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 font-mono">
                    Vehicle ID: {selectedAuction.vehicleId}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Seller Info */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Seller
                    </p>
                    <p className="text-xl font-bold text-slate-900 mb-2">
                      {selectedAuction.sellerName || "N/A"}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      ID: {selectedAuction.sellerId}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Status
                    </p>
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-200 text-slate-700 bg-white">
                      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                      {selectedAuction.status}
                    </span>
                  </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Starting Bid
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {selectedAuction.startingBid
                        ? `${selectedAuction.startingBid.toLocaleString()} EGP`
                        : "N/A"}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Current Bid
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {selectedAuction.currentBid
                        ? `${selectedAuction.currentBid.toLocaleString()} EGP`
                        : "No bids yet"}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Reserve Price
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {selectedAuction.reservePrice
                        ? `${selectedAuction.reservePrice.toLocaleString()} EGP`
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Timing Section */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-6">
                  <h5 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Auction Timeline
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Start Time</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedAuction.startTime
                          ? new Date(selectedAuction.startTime).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">End Time</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedAuction.endTime
                          ? new Date(selectedAuction.endTime).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        Original End Time
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedAuction.originalEndTime
                          ? new Date(
                              selectedAuction.originalEndTime,
                            ).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bidding Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Bid Count
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      </div>
                      <p className="text-2xl font-black text-slate-900">
                        {selectedAuction.bidCount || 0}{" "}
                        <span className="text-base font-normal text-slate-500">
                          bids
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Min Bid Increment
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                      </div>
                      <p className="text-2xl font-black text-slate-900">
                        {selectedAuction.minBidIncrement
                          ? `${selectedAuction.minBidIncrement.toLocaleString()} EGP`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Leading Bidder */}
                  {selectedAuction.leadingBidderId && (
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                        Leading Bidder
                      </p>
                      <p className="text-lg font-bold text-slate-900 mb-1">
                        {selectedAuction.leadingBidderName || "N/A"}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        ID: {selectedAuction.leadingBidderId}
                      </p>
                    </div>
                  )}

                  {/* Winner */}
                  {selectedAuction.winnerId && (
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 text-slate-500">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <p className="text-xs font-bold uppercase tracking-widest">
                          Winner
                        </p>
                      </div>
                      <p className="text-lg font-bold text-slate-900 mb-1">
                        {selectedAuction.winnerName || "N/A"}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        ID: {selectedAuction.winnerId}
                      </p>
                    </div>
                  )}
                </div>

                {/* Auto Extend Settings */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <svg
                      className="w-5 h-5 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <h5 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                      Auto Extension Settings
                    </h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Enabled</p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${selectedAuction.autoExtendEnabled ? "bg-slate-600" : "bg-slate-300"}`}
                        ></div>
                        <p className="text-base font-bold text-slate-900">
                          {selectedAuction.autoExtendEnabled ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">
                        Extension Time
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedAuction.autoExtendMinutes || 0}{" "}
                        <span className="text-sm font-normal text-slate-500">
                          min
                        </span>
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">
                        Max Extensions
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedAuction.maxAutoExtensions || 0}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Used</p>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedAuction.autoExtCount || 0}
                        <span className="text-sm text-slate-500">
                          {" "}
                          / {selectedAuction.maxAutoExtensions || 0}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    System Timestamps
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Created At</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedAuction.createdAt
                          ? new Date(selectedAuction.createdAt).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                    {selectedAuction.startedAt && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">
                          Started At
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(selectedAuction.startedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3">
                <button
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                  onClick={closeAuctionModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inspection Modal - Rendered at root level */}
        {showInspectionModal.open &&
          showInspectionModal.vehicle &&
          inspectionForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
                {/* Header - Fixed */}
                <div className="sticky top-0 p-6 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {showInspectionModal.viewMode
                        ? "View Inspection Report"
                        : "Create Inspection Report"}
                    </p>
                    <h3 className="text-xl font-black text-slate-900">
                      {showInspectionModal.vehicle.make}{" "}
                      {showInspectionModal.vehicle.model}{" "}
                      {showInspectionModal.vehicle.year}
                    </h3>
                  </div>
                  <button
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                    onClick={() => {
                      setShowInspectionModal({ open: false });
                      setInspectionErrors([]);
                      setInspectionTouched(new Set());
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Content - Scrollable */}
                <div className="overflow-y-auto max-h-[calc(100vh-280px)] p-6">
                  {/* Error Messages */}
                  {inspectionErrors.length > 0 && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          className="text-red-600 mt-0.5"
                          size={18}
                        />
                        <div className="flex-1">
                          {/* <p className="text-sm font-bold text-red-900 mb-1">Please fix the following errors:</p> */}
                          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                            {inspectionErrors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-5">
                    {/* Basic Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">
                          Inspector ID *
                        </span>
                        <input
                          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                            inspectionTouched.has("inspectorId") &&
                            !inspectionForm.inspectorId
                              ? "border-red-300 bg-red-50 focus:ring-red-500"
                              : "border-slate-200 focus:ring-indigo-500"
                          }`}
                          placeholder="Enter inspector ID"
                          value={inspectionForm.inspectorId}
                          onChange={(e) => {
                            setInspectionForm({
                              ...inspectionForm,
                              inspectorId: e.target.value,
                            });
                            setInspectionTouched(
                              new Set(inspectionTouched).add("inspectorId"),
                            );
                          }}
                          onBlur={() =>
                            setInspectionTouched(
                              new Set(inspectionTouched).add("inspectorId"),
                            )
                          }
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                        {inspectionTouched.has("inspectorId") &&
                          !inspectionForm.inspectorId && (
                            <span className="text-xs text-red-600 mt-1">
                              Inspector ID is required
                            </span>
                          )}
                      </label>
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">
                          Inspection Date *
                        </span>
                        <input
                          type="date"
                          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                            inspectionTouched.has("inspectionDate") &&
                            !inspectionForm.inspectionDate
                              ? "border-red-300 bg-red-50 focus:ring-red-500"
                              : "border-slate-200 focus:ring-indigo-500"
                          }`}
                          value={inspectionForm.inspectionDate}
                          onChange={(e) => {
                            setInspectionForm({
                              ...inspectionForm,
                              inspectionDate: e.target.value,
                            });
                            setInspectionTouched(
                              new Set(inspectionTouched).add("inspectionDate"),
                            );
                          }}
                          onBlur={() =>
                            setInspectionTouched(
                              new Set(inspectionTouched).add("inspectionDate"),
                            )
                          }
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                        {inspectionTouched.has("inspectionDate") &&
                          !inspectionForm.inspectionDate && (
                            <span className="text-xs text-red-600 mt-1">
                              Inspection date is required
                            </span>
                          )}
                      </label>
                    </div>

                    {/* Location & Odometer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">
                          Location City *
                        </span>
                        <input
                          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                            inspectionTouched.has("locationCity") &&
                            !inspectionForm.locationCity
                              ? "border-red-300 bg-red-50 focus:ring-red-500"
                              : "border-slate-200 focus:ring-indigo-500"
                          }`}
                          placeholder="Enter city"
                          value={inspectionForm.locationCity}
                          onChange={(e) => {
                            setInspectionForm({
                              ...inspectionForm,
                              locationCity: e.target.value,
                            });
                            setInspectionTouched(
                              new Set(inspectionTouched).add("locationCity"),
                            );
                          }}
                          onBlur={() =>
                            setInspectionTouched(
                              new Set(inspectionTouched).add("locationCity"),
                            )
                          }
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                        {inspectionTouched.has("locationCity") &&
                          !inspectionForm.locationCity && (
                            <span className="text-xs text-red-600 mt-1">
                              Location city is required
                            </span>
                          )}
                      </label>
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">
                          Odometer Reading (km) *
                        </span>
                        <input
                          type="number"
                          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                            inspectionTouched.has("odometerReading") &&
                            (!inspectionForm.odometerReading ||
                              inspectionForm.odometerReading <= 0)
                              ? "border-red-300 bg-red-50 focus:ring-red-500"
                              : "border-slate-200 focus:ring-indigo-500"
                          }`}
                          placeholder="0"
                          value={inspectionForm.odometerReading}
                          onChange={(e) => {
                            setInspectionForm({
                              ...inspectionForm,
                              odometerReading: Number(e.target.value),
                            });
                            setInspectionTouched(
                              new Set(inspectionTouched).add("odometerReading"),
                            );
                          }}
                          onBlur={() =>
                            setInspectionTouched(
                              new Set(inspectionTouched).add("odometerReading"),
                            )
                          }
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                        {inspectionTouched.has("odometerReading") &&
                          (!inspectionForm.odometerReading ||
                            inspectionForm.odometerReading <= 0) && (
                            <span className="text-xs text-red-600 mt-1">
                              Valid odometer reading is required
                            </span>
                          )}
                      </label>
                    </div>

                    {/* Condition Assessment - Organized */}
                    <div className="border-t border-slate-100 pt-5">
                      <h4 className="text-sm font-bold text-slate-900 mb-4">
                        Condition Assessment
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            key: "overallCondition",
                            label: "Overall Condition",
                          },
                          { key: "engineCond", label: "Engine" },
                          { key: "transmissionCond", label: "Transmission" },
                          { key: "suspensionCond", label: "Suspension" },
                          { key: "interiorCond", label: "Interior" },
                          { key: "paintCond", label: "Paint" },
                        ].map(({ key, label }) => (
                          <label key={key} className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 mb-2">
                              {label}
                            </span>
                            <select
                              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              value={(inspectionForm as any)[key]}
                              onChange={(e) =>
                                setInspectionForm({
                                  ...inspectionForm,
                                  [key]: e.target.value,
                                } as any)
                              }
                              disabled={
                                showInspectionModal.viewMode && !editMode
                              }
                            >
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="fair">Fair</option>
                              <option value="poor">Poor</option>
                            </select>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="border-t border-slate-100 pt-5">
                      <h4 className="text-sm font-bold text-slate-900 mb-4">
                        Inspection Details
                      </h4>
                      <div className="space-y-4">
                        <label className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 mb-2">
                            Accident History
                          </span>
                          <textarea
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Describe any accident history..."
                            rows={3}
                            value={
                              (inspectionForm as any).accidentHistory || ""
                            }
                            onChange={(e) =>
                              setInspectionForm({
                                ...inspectionForm,
                                accidentHistory: e.target.value,
                              })
                            }
                            disabled={showInspectionModal.viewMode && !editMode}
                          />
                        </label>
                        <label className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 mb-2">
                            Mechanical Issues
                          </span>
                          <textarea
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="List any mechanical issues found..."
                            rows={3}
                            value={
                              (inspectionForm as any).mechanicalIssues || ""
                            }
                            onChange={(e) =>
                              setInspectionForm({
                                ...inspectionForm,
                                mechanicalIssues: e.target.value,
                              })
                            }
                            disabled={showInspectionModal.viewMode && !editMode}
                          />
                        </label>
                        <label className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 mb-2">
                            Required Repairs
                          </span>
                          <textarea
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="List required repairs..."
                            rows={3}
                            value={
                              (inspectionForm as any).requiredRepairs || ""
                            }
                            onChange={(e) =>
                              setInspectionForm({
                                ...inspectionForm,
                                requiredRepairs: e.target.value,
                              })
                            }
                            disabled={showInspectionModal.viewMode && !editMode}
                          />
                        </label>
                        <label className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 mb-2">
                            Inspector Notes
                          </span>
                          <textarea
                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            placeholder="Additional inspector notes..."
                            rows={3}
                            value={(inspectionForm as any).inspectorNotes || ""}
                            onChange={(e) =>
                              setInspectionForm({
                                ...inspectionForm,
                                inspectorNotes: e.target.value,
                              })
                            }
                            disabled={showInspectionModal.viewMode && !editMode}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Cost & Document */}
                    <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">
                          Estimated Repair Cost (EGP)
                        </span>
                        <input
                          type="number"
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="0"
                          value={
                            (inspectionForm as any).estimatedRepairCost || ""
                          }
                          onChange={(e) =>
                            setInspectionForm({
                              ...inspectionForm,
                              estimatedRepairCost: Number(e.target.value),
                            })
                          }
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">
                          Photos URLs (comma-separated)
                        </span>
                        <input
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="https://..., https://..."
                          value={((inspectionForm as any).photosUrl || []).join(
                            ", ",
                          )}
                          onChange={(e) =>
                            setInspectionForm({
                              ...inspectionForm,
                              photosUrl: e.target.value
                                .split(",")
                                .map((url) => url.trim())
                                .filter((url) => url),
                            })
                          }
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">
                          Report Document URL
                        </span>
                        <input
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="https://..."
                          value={(inspectionForm as any).reportDocUrl || ""}
                          onChange={(e) =>
                            setInspectionForm({
                              ...inspectionForm,
                              reportDocUrl: e.target.value,
                            })
                          }
                          disabled={showInspectionModal.viewMode && !editMode}
                        />
                      </label>
                      <label className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-2">
                          Report Status
                        </span>
                        <select
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          value={(inspectionForm as any).status || "pending"}
                          onChange={(e) =>
                            setInspectionForm({
                              ...inspectionForm,
                              status: e.target.value,
                            })
                          }
                          disabled={showInspectionModal.viewMode && !editMode}
                        >
                          <option value="pending">Pending</option>
                          <option value="passed">Passed</option>
                          <option value="failed">Failed</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer - Fixed */}
                <div className="sticky bottom-0 p-6 border-t border-slate-200 flex justify-end gap-3 bg-white rounded-b-2xl">
                  {showInspectionModal.viewMode && !editMode && (
                    <>
                      <button
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                        onClick={() => {
                          setShowInspectionModal({ open: false });
                          setInspectionErrors([]);
                          setInspectionTouched(new Set());
                        }}
                      >
                        Close
                      </button>
                      <button
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all"
                        onClick={() => setEditMode(true)}
                      >
                        Edit Report
                      </button>
                    </>
                  )}
                  {showInspectionModal.viewMode && editMode && (
                    <>
                      <button
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                        onClick={() => {
                          setEditMode(false);
                          setInspectionErrors([]);
                          setInspectionTouched(new Set());
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all"
                        onClick={saveEditedReport}
                      >
                        Save Changes
                      </button>
                    </>
                  )}
                  {!showInspectionModal.viewMode && (
                    <>
                      <button
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                        onClick={() => {
                          setShowInspectionModal({ open: false });
                          setInspectionErrors([]);
                          setInspectionTouched(new Set());
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all"
                        onClick={saveReport}
                      >
                        Save Report
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* KYC Details Modal */}
        {showKYCModal && selectedKYC && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8">
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between rounded-t-3xl bg-white">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
                    KYC Details
                  </p>
                  <h3 className="text-2xl font-black text-slate-900">
                    {selectedKYC.firstName} {selectedKYC.lastName}
                  </h3>
                </div>
                <button
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                  onClick={() => {
                    setShowKYCModal(false);
                    setSelectedKYC(null);
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(100vh-200px)] p-8">
                {/* Profile Picture or Avatar */}
                <div className="mb-8 flex justify-center">
                  {selectedKYC.profileurl ? (
                    <img
                      src={selectedKYC.profileurl}
                      alt={`${selectedKYC.firstName} ${selectedKYC.lastName}`}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (
                          e.target as HTMLImageElement
                        ).parentElement!.innerHTML =
                          `<div class="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-4xl font-black shadow-lg">${selectedKYC.firstName?.[0] || "U"}${selectedKYC.lastName?.[0] || ""}</div>`;
                      }}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-4xl font-black shadow-lg">
                      {selectedKYC.firstName?.[0] || "U"}
                      {selectedKYC.lastName?.[0] || ""}
                    </div>
                  )}
                </div>

                {/* User Info Card */}
                <div className="mb-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                        User Profile
                      </p>
                      <h4 className="text-2xl font-black text-slate-900">
                        {selectedKYC.firstName} {selectedKYC.lastName}
                      </h4>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 font-mono mb-6">
                    User ID: {selectedKYC.id || selectedKYC.userId}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Email Address
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedKYC.email || "N/A"}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Phone Number
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedKYC.phone || "N/A"}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Location
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedKYC.locationCity || "N/A"}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Role
                      </p>
                      <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedKYC.role || "user"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                      Account Status
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${selectedKYC.isActive ? "bg-slate-600" : "bg-slate-300"}`}
                      ></div>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedKYC.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                      KYC Status
                    </p>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200 text-slate-700 bg-white">
                      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                      {selectedKYC.kycStatus || "pending"}
                    </span>
                  </div>

                  <div className="rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">
                      Ban Status
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${selectedKYC.isBanned ? "bg-slate-600" : "bg-slate-300"}`}
                      ></div>
                      <p className="text-lg font-bold text-slate-900">
                        {selectedKYC.isBanned ? "Banned" : "Not Banned"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                {selectedKYC.bio && (
                  <div className="mb-8 bg-white rounded-xl p-6 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
                      Bio
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedKYC.bio}
                    </p>
                  </div>
                )}

                {/* Ban Reason */}
                {selectedKYC.isBanned && selectedKYC.banreason && (
                  <div className="mb-8 bg-white rounded-xl p-6 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
                      Ban Reason
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedKYC.banreason}
                    </p>
                  </div>
                )}

                {/* KYC Document Section */}
                {selectedKYC.kycDocumentUrl && (
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <FileCheck className="w-5 h-5 text-slate-500" />
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                        KYC Document
                      </h4>
                    </div>
                    <a
                      href={selectedKYC.kycDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold bg-white hover:bg-slate-50 transition-all"
                    >
                      <Download size={18} />
                      Download KYC Document
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3">
                <button
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all"
                  onClick={() => {
                    setShowKYCModal(false);
                    setSelectedKYC(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
