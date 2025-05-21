
import React, { useState } from 'react';
import { Share2, Check, Copy, Twitter, Facebook } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareSetlistButtonProps {
  showId: string;
  showName: string;
  artistName: string;
}

const ShareSetlistButton: React.FC<ShareSetlistButtonProps> = ({
  showId,
  showName,
  artistName
}) => {
  const [copied, setCopied] = useState(false);
  
  // Generate the share URL for this setlist
  const shareUrl = `${window.location.origin}/shows/${showId}`;
  
  // Generate share text
  const shareText = `Check out the fan-voted setlist for ${artistName} at ${showName}! Vote for your favorite songs:`;
  
  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };
  
  // Share on Twitter
  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
    toast.success('Opening Twitter to share');
  };
  
  // Share on Facebook
  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank');
    toast.success('Opening Facebook to share');
  };
  
  // Share via native share API if available
  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${artistName} at ${showName} - Fan Setlist`,
        text: shareText,
        url: shareUrl,
      })
      .then(() => toast.success('Shared successfully!'))
      .catch((error) => {
        console.error('Error sharing:', error);
        toast.error('Error sharing');
      });
    } else {
      toast.error('Native sharing not supported on this device');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-sm"
        >
          <Share2 size={14} />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          {copied ? (
            <>
              <Check size={14} className="mr-2 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} className="mr-2" />
              Copy link
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={shareOnTwitter} className="cursor-pointer">
          <Twitter size={14} className="mr-2" />
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareOnFacebook} className="cursor-pointer">
          <Facebook size={14} className="mr-2" />
          Share on Facebook
        </DropdownMenuItem>
        {navigator.share && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={nativeShare} className="cursor-pointer">
              <Share2 size={14} className="mr-2" />
              Share via device
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareSetlistButton;
