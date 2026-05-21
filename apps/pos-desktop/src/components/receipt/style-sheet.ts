// style-sheet.ts

import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 18,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#222",
    lineHeight: 1.4,
  },

  // ================= HEADER =================
  header: {
    alignItems: "center",
    marginBottom: 18,
  },

  logo: {
    width: 42,
    height: 42,
    marginBottom: 8,
  },

  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },

  receiptMeta: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },

  // ================= ITEMS =================
  itemsContainer: {
    marginBottom: 18,
  },

  itemBlock: {
    marginBottom: 12,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  qty: {
    width: 20,
    fontSize: 11,
    fontWeight: "bold",
  },

  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },

  itemName: {
    fontSize: 11,
    fontWeight: "bold",
  },

  itemSub: {
    fontSize: 8,
    color: "#777",
    marginTop: 2,
  },

  itemTotal: {
    width: 52,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "bold",
  },

  modifierContainer: {
    marginTop: 4,
    marginLeft: 20,
  },

  modifier: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },

  // ================= TOTALS =================
  totals: {
    marginTop: 6,
    marginBottom: 20,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  totalLabel: {
    fontSize: 10,
    color: "#444",
  },

  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
  },

  totalDivider: {
    borderTopWidth: 1,
    borderTopColor: "#DDD",
    marginVertical: 6,
  },

  grandLabel: {
    fontSize: 13,
    fontWeight: "bold",
  },

  grandValue: {
    fontSize: 13,
    fontWeight: "bold",
  },

  // ================= QR =================
  // styles

  qrSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  qrWrapper: {
    width: 82,
    height: 82,
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 5,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },

  invoiceInfo: {
    flex: 1,
  },

  invoiceTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
  },

  invoiceText: {
    fontSize: 7,
    color: "#666",
    marginBottom: 2,
  },

  invoiceCode: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: "bold",
  },
  // ================= FOOTER =================
  footer: {
    alignItems: "center",
    marginTop: 10,
  },

  footerText: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },

  footerSub: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
    textAlign: "center",
  },

  powered: {
    marginTop: 10,
    fontSize: 8,
    color: "#888",
  },
});
