import { SupplierProvider, NegotiationProvider, SearchQuery, ProviderSupplierResult } from './types';
import { OndcProvider } from './ondc';
import { DirectApiProvider } from './direct';
import { MarketplaceProvider } from './marketplace';

export * from './types';
export * from './ondc';
export * from './direct';
export * from './marketplace';

/**
 * Universal Provider Registry
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private supplierProviders: Map<string, SupplierProvider> = new Map();
  private negotiationProviders: Map<string, NegotiationProvider> = new Map();

  private constructor() {
    const ondc = new OndcProvider();
    const direct = new DirectApiProvider();
    const marketplace = new MarketplaceProvider();

    this.registerSupplierProvider(ondc);
    this.registerSupplierProvider(direct);
    this.registerSupplierProvider(marketplace);

    this.registerNegotiationProvider(ondc);
    this.registerNegotiationProvider(direct);
    this.registerNegotiationProvider(marketplace);
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public registerSupplierProvider(provider: SupplierProvider) {
    this.supplierProviders.set(provider.code, provider);
  }

  public registerNegotiationProvider(provider: NegotiationProvider) {
    this.negotiationProviders.set(provider.code, provider);
  }

  public getSupplierProvider(code: string): SupplierProvider | undefined {
    return this.supplierProviders.get(code);
  }

  public getNegotiationProvider(code: string): NegotiationProvider | undefined {
    return this.negotiationProviders.get(code);
  }

  public getAllSupplierProviders(): SupplierProvider[] {
    return Array.from(this.supplierProviders.values());
  }

  /**
   * Search suppliers across all connected & active sources
   */
  public async searchAll(query: SearchQuery): Promise<{
    suppliers: ProviderSupplierResult[];
    sourceStatus: { code: string; name: string; available: boolean; error?: string }[];
  }> {
    const results: ProviderSupplierResult[] = [];
    const sourceStatus: { code: string; name: string; available: boolean; error?: string }[] = [];

    const providers = this.getAllSupplierProviders();
    const searchPromises = providers.map(async (provider) => {
      try {
        const res = await provider.search(query);
        sourceStatus.push({
          code: provider.code,
          name: provider.name,
          available: res.isAvailable,
          error: res.errorMessage
        });
        if (res.success && res.suppliers) {
          results.push(...res.suppliers);
        }
      } catch (err: any) {
        sourceStatus.push({
          code: provider.code,
          name: provider.name,
          available: false,
          error: err.message
        });
      }
    });

    await Promise.all(searchPromises);
    return { suppliers: results, sourceStatus };
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
