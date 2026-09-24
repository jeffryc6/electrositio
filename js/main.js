/**
 * MAIN.JS - CONTROLADOR DE ENTORNO Y FORMULARIO RFQ
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  if (window.InjectionSimulator3D) {
    new window.InjectionSimulator3D();
  }

  const rfqForm = document.getElementById('rfq-form');
  if (rfqForm) {
    rfqForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('¡Solicitud de proyecto recibida con éxito por el departamento de ingeniería de moldes de Electroplast! Responderemos formalmente en menos de 24 horas.');
      rfqForm.reset();
    });
  }
});
