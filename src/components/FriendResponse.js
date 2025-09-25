const FriendResponse = {
    render: (id, message) => {
      const el = document.getElementById(id);
      el.innerHTML = message 
        ? `<div class="friend-response">💬 ${message}</div>` 
        : `<div class="friend-response">No suggestion yet 🤔</div>`;
    }
  };
  
  export default FriendResponse;
  