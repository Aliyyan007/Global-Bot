const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Register the Edo SZ font
GlobalFonts.registerFromPath(path.join(__dirname, '../edosz.ttf'), 'Edo SZ');

/**
 * Generate a premium goodbye card with user's profile picture
 * 
 * @param {User} user - Discord user who left
 * @param {string} username - Username to display
 * @returns {Promise<Buffer>} Image buffer
 */
async function generateGoodbyeCard(user, username) {
    try {
        // Canvas dimensions - render at 2x resolution for better quality
        const scale = 2;
        const width = 1024;
        const height = 500;
        const canvas = createCanvas(width * scale, height * scale);
        const ctx = canvas.getContext('2d');
        
        // Scale context for high-DPI rendering
        ctx.scale(scale, scale);

        // Enable high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Create premium gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add subtle overlay pattern for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);

        // Load user avatar with highest quality
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 1024 });
        const avatar = await loadImage(avatarUrl);

        // Avatar settings - centered, larger, and positioned higher
        const avatarSize = 320; // Increased size
        const avatarX = (width - avatarSize) / 2;
        const avatarY = 30; // Moved up

        // Draw shadow behind avatar for depth
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 15;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw circular avatar with premium quality
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Add premium gradient border around avatar
        ctx.save();
        const borderGradient = ctx.createLinearGradient(
            avatarX, avatarY, 
            avatarX + avatarSize, avatarY + avatarSize
        );
        borderGradient.addColorStop(0, '#ffffff');
        borderGradient.addColorStop(0.5, '#e0e0e0');
        borderGradient.addColorStop(1, '#ffffff');
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 14; // Thicker border
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Add outer glow effect
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const goodbyeY = avatarY + avatarSize + 60;

        // Draw "GOODBYE" text with crystal clear styling using Edo SZ font
        ctx.save();
        
        // Use Edo SZ font with larger size for clarity
        ctx.font = '100px "Edo SZ"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        ctx.shadowOffsetX = 0;
        
        // Draw thick black outline first for contrast
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText('GOODBYE', width / 2, goodbyeY);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Draw pure white fill - crystal clear
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('GOODBYE', width / 2, goodbyeY);
        
        ctx.restore();

        // Draw username text - smaller and pure white
        const usernameY = goodbyeY + 60;
        
        // Truncate username if too long
        let displayName = username; // Keep original case
        if (displayName.length > 20) {
            displayName = displayName.substring(0, 17) + '...';
        }

        // Username shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 4;
        
        ctx.font = 'bold 36px Arial, sans-serif'; // Decreased size
        ctx.fillStyle = '#FFFFFF'; // Pure white
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayName, width / 2, usernameY);
        
        // Username outline for clarity
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(displayName, width / 2, usernameY);
        ctx.restore();

        // Add decorative elements - subtle corner accents
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        
        // Top left corner
        ctx.beginPath();
        ctx.moveTo(30, 60);
        ctx.lineTo(30, 30);
        ctx.lineTo(60, 30);
        ctx.stroke();
        
        // Top right corner
        ctx.beginPath();
        ctx.moveTo(width - 60, 30);
        ctx.lineTo(width - 30, 30);
        ctx.lineTo(width - 30, 60);
        ctx.stroke();
        
        // Bottom left corner
        ctx.beginPath();
        ctx.moveTo(30, height - 60);
        ctx.lineTo(30, height - 30);
        ctx.lineTo(60, height - 30);
        ctx.stroke();
        
        // Bottom right corner
        ctx.beginPath();
        ctx.moveTo(width - 60, height - 30);
        ctx.lineTo(width - 30, height - 30);
        ctx.lineTo(width - 30, height - 60);
        ctx.stroke();

        // Return high quality PNG buffer
        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error('Error generating goodbye card:', error);
        throw error;
    }
}

module.exports = { generateGoodbyeCard };
