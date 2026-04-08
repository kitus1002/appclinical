"use client";

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register a nice font if possible, or use standard
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    borderBottom: '2pt solid #221.2 83.2% 53.3%', // Using clinic primary blue
    paddingBottom: 15,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
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
    marginBottom: 2,
  },
  doctorInfo: {
    fontSize: 10,
    color: '#4a5568',
  },
  patientSection: {
    backgroundColor: '#f7fafc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontWeight: 'bold',
    color: '#718096',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 11,
    marginTop: 2,
  },
  prescriptionBody: {
    minHeight: 300,
    padding: 10,
    border: '1pt solid #edf2f7',
    borderRadius: 5,
  },
  rxTitle: {
    fontSize: 24,
    color: '#2b6cb0',
    opacity: 0.1,
    position: 'absolute',
    top: 150,
    left: 200,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1pt solid #edf2f7',
    paddingTop: 10,
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  }
});

interface PrescriptionProps {
  clinic: {
    nombre: string;
    logo_url?: string;
    cedula_profesional: string;
    especialidad: string;
    universidad: string;
    direccion_fisica: string;
    telefono_contacto: string;
  };
  patient: {
    nombre: string;
    fecha_nacimiento?: string;
  };
  content: string;
  date: string;
}

export const PrescriptionPdf = ({ clinic, patient, content, date }: PrescriptionProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        {clinic.logo_url ? (
          <Image src={clinic.logo_url} style={styles.logoContainer} />
        ) : (
          <View style={[styles.logoContainer, { backgroundColor: '#ebf8ff', borderRadius: 30, alignItems: 'center', justifyContent: 'center' }]}>
             <Text style={{ color: '#3182ce', fontWeight: 'bold' }}>AC</Text>
          </View>
        )}
        <View style={styles.clinicInfo}>
          <Text style={styles.clinicName}>{clinic.nombre}</Text>
          <Text style={styles.doctorInfo}>{clinic.especialidad}</Text>
          <Text style={styles.doctorInfo}>Cédula: {clinic.cedula_profesional}</Text>
          <Text style={styles.doctorInfo}>{clinic.universidad}</Text>
        </View>
      </View>

      {/* Date */}
      <View style={{ textAlign: 'right', marginBottom: 10 }}>
        <Text style={styles.label}>Fecha:</Text>
        <Text style={styles.value}>{date}</Text>
      </View>

      {/* Patient Section */}
      <View style={styles.patientSection}>
        <View>
          <Text style={styles.label}>Paciente:</Text>
          <Text style={styles.value}>{patient.nombre}</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
           <Text style={styles.label}>Edad:</Text>
           <Text style={styles.value}>
             {patient.fecha_nacimiento 
               ? `${new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear()} años`
               : 'N/A'}
           </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.prescriptionBody}>
        <Text style={styles.rxTitle}>Rx RECETA MÉDICA</Text>
        <Text style={{ fontSize: 12, lineHeight: 1.5 }}>
          {content || 'Escriba las indicaciones aquí...'}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>{clinic.direccion_fisica}</Text>
        <Text>Tel: {clinic.telefono_contacto} | Email: {clinic.nombre.toLowerCase()}@clinica.com</Text>
      </View>
    </Page>
  </Document>
);
