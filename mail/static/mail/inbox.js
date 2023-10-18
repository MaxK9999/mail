document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);
  document.querySelector('#compose-form').addEventListener('submit', send_mail);

  // By default, load the inbox
  load_mailbox('inbox');
});


function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#emails-detail-view').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}


function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#emails-detail-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  const mailTable = document.createElement('table');
  mailTable.className = "table table-borderless table-hover";
  const tbody = document.createElement('tbody');

  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      emails.forEach(Email => {
        const mailRow = document.createElement('tr');
        mailRow.innerHTML = `
          <td>From: ${Email.sender}</td>
          <td>${Email.subject}</td>
          <td>${Email.body}</td>
          <td>${Email.timestamp}</td>
        `;
        // Add click functionality for email viewing
        mailRow.addEventListener('click', function() {
          view_mail(Email.id, mailbox);

          // Change background if read
          if (!Email.read) {
            mark_read(Email.id);
          }

          // Highlight the row
          mailRow.classList.add('selected');
        });

        // Add 'read' or 'unread' class based on the status
        mailRow.classList.toggle('read', Email.read);
        mailRow.classList.toggle('unread', !Email.read);

        tbody.appendChild(mailRow);
      });
      mailTable.appendChild(tbody);
      document.querySelector('#emails-view').appendChild(mailTable);
    });
}


function send_mail(event) {
  event.preventDefault();

  // Store all the fields
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Send to backend
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
    })
  })
  .then(response => response.json())
  .then(result => {
      // Print result
      console.log(result);
      load_mailbox('sent');
  });

}


function view_mail(id, mailbox) {
  fetch(`/emails/${id}`)
  .then(response => response.json())
  .then(email => {
    console.log(email);
    load_mailbox('inbox');

    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';
    document.querySelector('#emails-detail-view').style.display = 'block';

    const emailDetail = document.createElement('div');
    emailDetail.innerHTML = `
    <h3>Email Details</h3>
    <div class="form-group">
      From: <input disabled class="form-control" value="${email.sender}">
    </div>
    <div class="form-group">
      To: <input disabled class="form-control" value="${email.recipients.join(', ')}">
    </div>
    <div class="form-group">
      Subject: <input disabled class="form-control" value="${email.subject}">
    </div>
    <div class="form-group">
      Body: <textarea disabled class="form-control">${email.body}</textarea>
    </div>
    `;

    document.querySelector('#emails-detail-view').innerHTML = '';
    document.querySelector('#emails-detail-view').appendChild(emailDetail);

    // Email read or unread logic
    if (!email.read) {
      fetch(`/emails/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      })
    }

    // Archiving emails 
    if (mailbox !== 'sent') {
      const archive = document.createElement('button');
      archive.innerHTML = email.archived ? "unarchive": "archive";
      archive.className = email.archived ? "btn btn-danger": "btn btn-success";
      archive.addEventListener('click', function() {
        fetch(`/emails/${email.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            archived: !email.archived
          })
        })
        .then(() => {
          load_mailbox('archive')
        })
      });
      document.querySelector('#emails-detail-view').append(archive);

      // Reply to emails
      const reply = document.createElement('button');
      reply.innerHTML = "reply";
      reply.className = "btn btn-info";
      reply.addEventListener('click', function() {
        compose_email();

        document.querySelector('#compose-recipients').value = email.sender;

        const originalSubject = email.subject;
        let replySubject = originalSubject.startsWith("Re: ") ? originalSubject: `Re: ${originalSubject}`;
        document.querySelector('#compose-subject').value = replySubject;
        document.querySelector('#compose-body').value = `On ${email.timestamp} ${email.sender} wrote ${email.body}`;
      });
      document.querySelector('#emails-detail-view').append(reply);
    }
  });
}