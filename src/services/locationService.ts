export interface District {
  code: string;
  name: string;
  wards?: Ward[];
}

export interface Province {
  code: string;
  name: string;
}

export interface Ward {
  code: string;
  name: string;
}

interface CasProvinceResponse {
  provinces: Province[];
}

interface CasCommunesResponse {
  communes: Ward[];
}

const BASE_URL = 'https://production.cas.so/address-kit';
const EFFECTIVE_DATE = '2025-07-01';

export const locationService = {
  async getProvinces(): Promise<Province[]> {
    const response = await fetch(`${BASE_URL}/${EFFECTIVE_DATE}/provinces`);
    if (!response.ok) {
      throw new Error('Không tải được danh sách tỉnh/thành phố');
    }

    const data = (await response.json()) as CasProvinceResponse;
    const provinces = data.provinces ?? [];
    return provinces.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  },

  async getDistrictsByProvinceCode(provinceCode: string): Promise<District[]> {
    const wards = await this.getWardsByProvinceCode(provinceCode);
    return wards.map((ward) => ({ code: ward.code, name: ward.name }));
  },

  async getWardsByProvinceCode(provinceCode: string): Promise<Ward[]> {
    const response = await fetch(`${BASE_URL}/${EFFECTIVE_DATE}/provinces/${provinceCode}/communes`);
    if (!response.ok) {
      throw new Error('Không tải được danh sách xã/phường');
    }

    const data = (await response.json()) as CasCommunesResponse;
    const wards = (data.communes ?? []).filter(
      (ward) => ward.name && ward.name.trim().length > 1 && ward.name.trim() !== '.',
    );

    return wards.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  },
};
