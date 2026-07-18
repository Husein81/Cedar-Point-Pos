import { ProductForm } from "@/components/products/ProductForm";
import TitleBar from "@/components/title-bar";
import { useProduct } from "@/hooks/useProduct";
import { useModalStore } from "@/store/modalStore";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { Badge, Button, Shad } from "@repo/ui";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, DollarSign, Package } from "lucide-react";

export const Route = createFileRoute("/products/$productId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { productId } = useParams({ from: "/products/$productId" });
  const { data: product, isLoading } = useProduct(productId);
  const openModal = useModalStore((state) => state.openModal);

  const handleEdit = () => {
    if (product) {
      openModal("Edit Product", <ProductForm product={product} />);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <p className="text-gray-500 mb-4">Product not found</p>
        <Link to="/products">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TitleBar
        title={product.name}
        subtitle={product.description ?? ""}
        actions={<Button onClick={handleEdit}>Edit Product</Button>}
        href="/products"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Price
            </Shad.CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              {product.price ? `$${product.price}` : "—"}
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Cost
            </Shad.CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              {product.cost ? `$${product.cost}` : "—"}
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Margin
            </Shad.CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-2xl font-bold">
              {product.price && product.cost
                ? `${(((parseFloat(product.price.toString()) - parseFloat(product.cost.toString())) / parseFloat(product.price.toString())) * 100).toFixed(1)}%`
                : "—"}
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Shad.CardTitle className="text-sm font-medium">
              Category
            </Shad.CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </Shad.CardHeader>
          <Shad.CardContent>
            <div className="text-lg font-semibold">
              {product.category?.name || "—"}
            </div>
            {product.subcategory && (
              <div className="text-sm text-gray-500">
                {product.subcategory.name}
              </div>
            )}
          </Shad.CardContent>
        </Shad.Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Shad.Card>
          <Shad.CardHeader>
            <Shad.CardTitle>Product Information</Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">SKU</p>
                <p className="text-base">{product.sku || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Barcode</p>
                <p className="text-base">{product.barcode || "—"}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Image URL</p>
              <p className="text-base break-all">{product.imageUrl || "—"}</p>
            </div>
          </Shad.CardContent>
        </Shad.Card>

        <Shad.Card>
          <Shad.CardHeader>
            <Shad.CardTitle>Settings</Shad.CardTitle>
          </Shad.CardHeader>
          <Shad.CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Status</span>
              {product.isActive ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Modifiable</span>
              {product.isModifiable ? (
                <Badge>Yes</Badge>
              ) : (
                <Badge variant="outline">No</Badge>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="text-base">
                {new Date(product.createdAt).toLocaleDateString(DEFAULT_LOCALE, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </Shad.CardContent>
        </Shad.Card>
      </div>
    </div>
  );
}
