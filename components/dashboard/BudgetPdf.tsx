"use client";

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottom: '1pt solid #eee',
    paddingBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
  },
  clinicInfo: {
    textAlign: 'right',
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 5,
  },
  budgetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2b6cb0',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 5,
  },
  label: {
    fontWeight: 'bold',
    color: '#718096',
    fontSize: 8,
    marginBottom: 2,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
  },
  tableHeader: {
    backgroundColor: '#edf2f7',
    fontWeight: 'bold',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRightWidth: 1,
    padding: 8,
  },
  tableColDesc: {
    width: '50%',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRightWidth: 1,
    padding: 8,
  },
  summary: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  summaryBox: {
    width: '40%',
    borderTop: '1pt solid #eee',
    paddingTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  total: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    marginTop: 10,
    borderTop: '1pt solid #2d3748',
    paddingTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 50,
    textAlign: 'center',
    color: '#cbd5e0',
    fontSize: 8,
    borderTop: '1pt solid #eee',
    paddingTop: 10,
  },
  notes: {
    marginTop: 40,
    fontSize: 9,
    fontStyle: 'italic',
    color: '#718096',
  }
});

interface BudgetPdfProps {
  clinic: any;
  patient: any;
  items: Array<{ description: string; quantity: number; price: number }>;
  notes?: string;
  id: string;
}

export const BudgetPdf = ({ clinic, patient, items, notes, id }: BudgetPdfProps) => {
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal; // Simplified

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {clinic.logo_url ? (
            <Image src={clinic.logo_url} style={styles.logo} />
          ) : (
            <View style={[styles.logo, { backgroundColor: '#ebf8ff', alignItems: 'center', justifyContent: 'center' }]}>
               <Text style={{ fontSize: 20, color: '#3182ce' }}>AC</Text>
            </View>
          )}
          <View style={styles.clinicInfo}>
            <Text style={styles.clinicName}>{clinic.nombre}</Text>
            <Text>{clinic.direccion_fisica}</Text>
            <Text>{clinic.telefono_contacto}</Text>
          </View>
        </View>

        <Text style={styles.budgetTitle}>Presupuesto Formal</Text>

        {/* Info */}
        <View style={styles.infoSection}>
          <View>
            <Text style={styles.label}>DIRIGIDO A:</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{patient.nombre}</Text>
            <Text>ID de Paciente: {patient.id.slice(0, 8)}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={styles.label}>NÚMERO DE PRESUPUESTO:</Text>
            <Text>#{id || '0001'}</Text>
            <Text style={styles.label}>FECHA DE EMISIÓN:</Text>
            <Text>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColDesc}><Text>Descripción del Servicio</Text></View>
            <View style={styles.tableCol}><Text>Cant.</Text></View>
            <View style={styles.tableCol}><Text>Precio Unit.</Text></View>
            <View style={styles.tableCol}><Text>Total</Text></View>
          </View>
          
          {items.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.tableColDesc}><Text>{item.description}</Text></View>
              <View style={styles.tableCol}><Text>{item.quantity}</Text></View>
              <View style={styles.tableCol}><Text>${item.price.toLocaleString()}</Text></View>
              <View style={styles.tableCol}><Text>${(item.price * item.quantity).toLocaleString()}</Text></View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text>Subtotal:</Text>
              <Text>${subtotal.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.total]}>
              <Text>TOTAL:</Text>
              <Text>${total.toLocaleString()} MXN</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notes}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Notas y Condiciones:</Text>
          <Text>{notes || "• Este presupuesto tiene una validez de 15 días.\n• Los precios están sujetos a cambios sin previo aviso tras la expiración."}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Este documento es un presupuesto informativo y no representa una factura fiscal.</Text>
          <Text>Gracias por confiar en {clinic.nombre}.</Text>
        </View>
      </Page>
    </Document>
  );
};
