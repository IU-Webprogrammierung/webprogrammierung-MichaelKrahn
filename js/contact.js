// EmailJS Configuration

(function() {
    const PUBLIC_KEY = 'fvP3NsksJt5YUn4JI';
    
    const SERVICE_ID = 'service_pbuvfcd';
    
    // Template for email to YOU (the website owner)
    const TEMPLATE_ID = 'template_gzsl61r';

    // Initialize EmailJS
    emailjs.init(PUBLIC_KEY);

    const contactForm = document.getElementById('contact-form');
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Wird gesendet...';

        // Get form data
        const fromName = document.getElementById('name').value;
        const fromEmail = document.getElementById('email').value;
        const message = document.getElementById('message').value;
        
        // Your email where you want to receive messages
        const myEmail = 'michael.penner97@web.de';

        // Data for emailjs
        const EmailData = {
            from_name: fromName,
            from_email: fromEmail,
            message: message,
            my_email: myEmail
        };

        // Send email to YOU (website owner)
        emailjs.send(SERVICE_ID, TEMPLATE_ID, EmailData)
            .then(function(response) {
                // Both emails sent successfully
                alert('Nachricht erfolgreich gesendet! Eine Bestätigung wurde an Ihre E-Mail-Adresse gesendet.');
                contactForm.reset();
            })
            .catch(function(error) {
                console.error('EmailJS Error:', error);
                alert('Fehler beim Senden der Nachricht. Bitte versuchen Sie es erneut.');
            })
            .finally(function() {
                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Nachricht senden';
            });
    });
})();
