const FoodCard = {
    render: (id, food) => {
      const el = document.getElementById(id);
      if (!food) {
        el.innerHTML = "<p>No food suggestion yet 🍽️</p>";
        return;
      }
  
      el.innerHTML = `
        <div class="food-card">
          <h3>${food.emoji || '🍴'} ${food.name || 'Unknown Dish'}</h3>
          <p><strong>Category:</strong> ${food.category || 'N/A'}</p>
          <p><strong>Type:</strong> ${food.type || 'N/A'}</p>
          <p><strong>Country:</strong> ${food.country || 'Local'}</p>
          ${food.tags && food.tags.length > 0 
            ? `<p><strong>Tags:</strong> ${food.tags.join(', ')}</p>` 
            : ""}
        </div>
      `;
    }
  };
  
  export default FoodCard;
  