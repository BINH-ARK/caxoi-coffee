/**
 * Module Tích Hợp Google Maps & Tính Phí Giao Hàng Cho Cà Xòi Coffee Đà Nẵng
 */

export interface LocationCoordinate {
  lat: number;
  lng: number;
}

export const CAXOI_STORE = {
  name: "Cà Xòi Coffee - Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở",
  address: "02 Quang Trung, Phường Thạch Thang, Quận Hải Châu, TP. Đà Nẵng",
  coordinate: {
    lat: 16.07484,
    lng: 108.22415,
  },
  baseFee: 15000,
  baseDistanceKm: 2.5,
  feePerExtraKm: 4000,
  freeDeliveryMinCups: 3,
};

// Cơ sở dữ liệu tọa độ định vị chính xác các tòa nhà văn phòng và khu vực tại Đà Nẵng
export const DANANG_LOCATIONS: Record<string, { name: string; coordinate: LocationCoordinate; defaultDistanceKm?: number }> = {
  "software park": {
    name: "Software Park Đà Nẵng (02 Quang Trung, Hải Châu)",
    coordinate: { lat: 16.07484, lng: 108.22415 },
    defaultDistanceKm: 0.1,
  },
  "indochina": {
    name: "Indochina Riverside Towers (74 Bạch Đằng, Hải Châu)",
    coordinate: { lat: 16.0712, lng: 108.2245 },
    defaultDistanceKm: 0.5,
  },
  "bưu điện": {
    name: "Tòa nhà Bưu điện Đà Nẵng (155 Trần Phú, Hải Châu)",
    coordinate: { lat: 16.0689, lng: 108.2227 },
    defaultDistanceKm: 0.8,
  },
  "buu dien": {
    name: "Tòa nhà Bưu điện Đà Nẵng (155 Trần Phú, Hải Châu)",
    coordinate: { lat: 16.0689, lng: 108.2227 },
    defaultDistanceKm: 0.8,
  },
  "acb": {
    name: "ACB Tower Đà Nẵng (218 Bạch Đằng, Hải Châu)",
    coordinate: { lat: 16.0645, lng: 108.2238 },
    defaultDistanceKm: 1.2,
  },
  "vĩnh trung": {
    name: "Vĩnh Trung Plaza (255 Hùng Vương, Thanh Khê)",
    coordinate: { lat: 16.0673, lng: 108.2124 },
    defaultDistanceKm: 1.5,
  },
  "vinh trung": {
    name: "Vĩnh Trung Plaza (255 Hùng Vương, Thanh Khê)",
    coordinate: { lat: 16.0673, lng: 108.2124 },
    defaultDistanceKm: 1.5,
  },
  "công viên phần mềm số 2": {
    name: "Công viên Phần mềm số 2 (Software Park 2 - Thuận Phước)",
    coordinate: { lat: 16.0915, lng: 108.2185 },
    defaultDistanceKm: 2.0,
  },
  "software park 2": {
    name: "Công viên Phần mềm số 2 (Software Park 2 - Thuận Phước)",
    coordinate: { lat: 16.0915, lng: 108.2185 },
    defaultDistanceKm: 2.0,
  },
  "shb": {
    name: "Tòa nhà SHB Đà Nẵng (Nguyễn Văn Linh, Hải Châu)",
    coordinate: { lat: 16.0605, lng: 108.2170 },
    defaultDistanceKm: 2.0,
  },
  "viettel": {
    name: "Tòa nhà Viettel Đà Nẵng (Nguyễn Văn Linh, Hải Châu)",
    coordinate: { lat: 16.0601, lng: 108.2165 },
    defaultDistanceKm: 2.1,
  },
  "phi long": {
    name: "Tòa nhà Phi Long Technology (Nguyễn Văn Linh, Thanh Khê)",
    coordinate: { lat: 16.0612, lng: 108.2098 },
    defaultDistanceKm: 2.2,
  },
  "fpt complex": {
    name: "FPT Complex Đà Nẵng (KĐT FPT City, Ngũ Hành Sơn)",
    coordinate: { lat: 15.9865, lng: 108.2612 },
    defaultDistanceKm: 12.5,
  },
  "fpt city": {
    name: "FPT Complex Đà Nẵng (KĐT FPT City, Ngũ Hành Sơn)",
    coordinate: { lat: 15.9865, lng: 108.2612 },
    defaultDistanceKm: 12.5,
  },
  "hải châu": {
    name: "Khu vực Quận Hải Châu, Đà Nẵng",
    coordinate: { lat: 16.0620, lng: 108.2200 },
    defaultDistanceKm: 1.6,
  },
  "hai chau": {
    name: "Khu vực Quận Hải Châu, Đà Nẵng",
    coordinate: { lat: 16.0620, lng: 108.2200 },
    defaultDistanceKm: 1.6,
  },
  "thanh khê": {
    name: "Khu vực Quận Thanh Khê, Đà Nẵng",
    coordinate: { lat: 16.0610, lng: 108.1880 },
    defaultDistanceKm: 3.5,
  },
  "thanh khe": {
    name: "Khu vực Quận Thanh Khê, Đà Nẵng",
    coordinate: { lat: 16.0610, lng: 108.1880 },
    defaultDistanceKm: 3.5,
  },
  "sơn trà": {
    name: "Khu vực Quận Sơn Trà, Đà Nẵng",
    coordinate: { lat: 16.0700, lng: 108.2400 },
    defaultDistanceKm: 3.0,
  },
  "son tra": {
    name: "Khu vực Quận Sơn Trà, Đà Nẵng",
    coordinate: { lat: 16.0700, lng: 108.2400 },
    defaultDistanceKm: 3.0,
  },
  "ngũ hành sơn": {
    name: "Khu vực Quận Ngũ Hành Sơn, Đà Nẵng",
    coordinate: { lat: 16.0300, lng: 108.2500 },
    defaultDistanceKm: 7.0,
  },
  "ngu hanh son": {
    name: "Khu vực Quận Ngũ Hành Sơn, Đà Nẵng",
    coordinate: { lat: 16.0300, lng: 108.2500 },
    defaultDistanceKm: 7.0,
  },
  "cẩm lệ": {
    name: "Khu vực Quận Cẩm Lệ, Đà Nẵng",
    coordinate: { lat: 16.0200, lng: 108.2000 },
    defaultDistanceKm: 7.5,
  },
  "cam le": {
    name: "Khu vực Quận Cẩm Lệ, Đà Nẵng",
    coordinate: { lat: 16.0200, lng: 108.2000 },
    defaultDistanceKm: 7.5,
  },
  "liên chiểu": {
    name: "Khu vực Quận Liên Chiểu, Đà Nẵng",
    coordinate: { lat: 16.0850, lng: 108.1400 },
    defaultDistanceKm: 9.5,
  },
  "lien chieu": {
    name: "Khu vực Quận Liên Chiểu, Đà Nẵng",
    coordinate: { lat: 16.0850, lng: 108.1400 },
    defaultDistanceKm: 9.5,
  },
};

/**
 * Công thức Haversine tính khoảng cách theo đường chim bay giữa 2 tọa độ (km)
 */
function calculateHaversineDistanceKm(
  coord1: LocationCoordinate,
  coord2: LocationCoordinate
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLon = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface DistanceCalculationResult {
  distanceKm: number;
  durationMinutes: number;
  deliveryFee: number;
  isFreeDelivery: boolean;
  provider: "GOOGLE_MAPS_API" | "SMART_LOCAL_ROUTING";
  googleMapsDirectionsUrl: string;
  destinationTitle: string;
}

/**
 * Tính toán phí giao hàng dựa theo khoảng cách km và số lượng ly
 */
export function computeDeliveryFee(
  distanceKm: number,
  totalCups: number = 1,
  isTakeaway: boolean = false
): { deliveryFee: number; isFreeDelivery: boolean } {
  if (isTakeaway || totalCups >= CAXOI_STORE.freeDeliveryMinCups) {
    return { deliveryFee: 0, isFreeDelivery: true };
  }

  const baseFee = CAXOI_STORE.baseFee;
  if (distanceKm <= CAXOI_STORE.baseDistanceKm) {
    return { deliveryFee: baseFee, isFreeDelivery: false };
  }

  const extraKm = distanceKm - CAXOI_STORE.baseDistanceKm;
  const extraFee = Math.ceil(extraKm * CAXOI_STORE.feePerExtraKm / 1000) * 1000;
  return { deliveryFee: baseFee + extraFee, isFreeDelivery: false };
}

/**
 * Tạo URL mở Google Maps chỉ đường trực tiếp từ quán đến khách hàng
 */
export function buildGoogleMapsDirectionsUrl(destinationAddress: string): string {
  const origin = encodeURIComponent(CAXOI_STORE.address);
  const destination = encodeURIComponent(destinationAddress.trim() + ", Đà Nẵng");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=two_wheeler`;
}

/**
 * Tính khoảng cách & phí giao hàng qua Google Maps API hoặc bộ định vị thông minh
 */
export async function calculateShippingDistance(
  destination: string,
  totalCups: number = 1,
  isTakeaway: boolean = false
): Promise<DistanceCalculationResult> {
  const cleanDest = destination.trim();
  const lowerDest = cleanDest.toLowerCase();
  const mapsUrl = buildGoogleMapsDirectionsUrl(cleanDest);

  // 1. Thử gọi Google Maps Distance Matrix API nếu có API key
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const originParam = encodeURIComponent(CAXOI_STORE.address);
      const destParam = encodeURIComponent(cleanDest + ", Đà Nẵng, Việt Nam");
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originParam}&destinations=${destParam}&mode=bicycling&language=vi&key=${apiKey}`;

      const res = await fetch(url, { next: { revalidate: 3600 } });
      const data = await res.json();

      if (
        data.status === "OK" &&
        data.rows?.[0]?.elements?.[0]?.status === "OK"
      ) {
        const element = data.rows[0].elements[0];
        const meters = element.distance.value;
        const seconds = element.duration.value;
        const distanceKm = Math.round((meters / 1000) * 10) / 10;
        const durationMinutes = Math.max(3, Math.round(seconds / 60));
        const feeInfo = computeDeliveryFee(distanceKm, totalCups, isTakeaway);

        return {
          distanceKm,
          durationMinutes,
          deliveryFee: feeInfo.deliveryFee,
          isFreeDelivery: feeInfo.isFreeDelivery,
          provider: "GOOGLE_MAPS_API",
          googleMapsDirectionsUrl: mapsUrl,
          destinationTitle: cleanDest,
        };
      }
    } catch (e) {
      console.warn("[Google Maps API] Không thể truy vấn, chuyển sang Smart Local Routing:", e);
    }
  }

  // 2. Fallback: Định vị chuẩn xác theo địa chỉ / tòa nhà văn phòng Đà Nẵng
  let distanceKm = 2.0; // Mặc định quận trung tâm Hải Châu
  let matchedTitle = cleanDest;

  for (const [key, loc] of Object.entries(DANANG_LOCATIONS)) {
    if (lowerDest.includes(key)) {
      if (loc.defaultDistanceKm !== undefined) {
        distanceKm = loc.defaultDistanceKm;
      } else {
        // Áp dụng hệ số uốn lượn đường phố 1.25x so với đường thẳng
        const crowKm = calculateHaversineDistanceKm(CAXOI_STORE.coordinate, loc.coordinate);
        distanceKm = Math.round(crowKm * 1.25 * 10) / 10;
      }
      matchedTitle = loc.name;
      break;
    }
  }

  // Nếu nhập địa chỉ đường phố cụ thể nhưng không khớp tòa nhà
  if (distanceKm === 2.0) {
    if (lowerDest.includes("hải châu") || lowerDest.includes("hai chau") || lowerDest.includes("bạch đằng") || lowerDest.includes("quang trung") || lowerDest.includes("trần phú") || lowerDest.includes("lê duẩn")) {
      distanceKm = 1.5;
    } else if (lowerDest.includes("thanh khê") || lowerDest.includes("thanh khe") || lowerDest.includes("nguyễn văn linh") || lowerDest.includes("điện biên phủ")) {
      distanceKm = 2.8;
    } else if (lowerDest.includes("sơn trà") || lowerDest.includes("son tra")) {
      distanceKm = 3.5;
    } else if (lowerDest.includes("ngũ hành sơn") || lowerDest.includes("ngu hanh son")) {
      distanceKm = 7.0;
    } else if (lowerDest.includes("cẩm lệ") || lowerDest.includes("cam le")) {
      distanceKm = 6.5;
    } else if (lowerDest.includes("liên chiểu") || lowerDest.includes("lien chieu")) {
      distanceKm = 9.0;
    }
  }

  // Tốc độ xe máy giao hàng trung bình nội thành ~25km/h (tính cả lấy xe và gửi bảo vệ)
  const durationMinutes = Math.max(5, Math.round(distanceKm * 2.5 + 4));
  const feeInfo = computeDeliveryFee(distanceKm, totalCups, isTakeaway);

  return {
    distanceKm,
    durationMinutes,
    deliveryFee: feeInfo.deliveryFee,
    isFreeDelivery: feeInfo.isFreeDelivery,
    provider: "SMART_LOCAL_ROUTING",
    googleMapsDirectionsUrl: mapsUrl,
    destinationTitle: matchedTitle,
  };
}
