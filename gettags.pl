#!/usr/bin/env perl

use Image::Magick;
use Music::Tag;

# set these to your Amazon Developer keys
my $token = '';
my $secret_key = '';

$opt_f = shift @ARGV;
$opt_i = shift @ARGV;
exit unless defined $opt_f && defined $opt_i;

my $info = Music::Tag->new($opt_f, {
	'quiet' => 1,
	,'secret_key' => $secret_key
	,'token' => $token
});

$info->add_plugin('Amazon') if $token;
$info->get_tag();

my $picture = undef;
if($info->picture_exists()) {
        $picture = $info->get_picture();
} else {
	# the Music::Tag::MP3 looks for APIC 'Cover (front)', and none of my
	# MP3s have that specific type of cover set.  So, if it's an MP3, grab
	# the first APIC if it exists.
        if($info->filetype() eq 'mp3' && exists($info->plugin('MP3')->mp3()->{'ID3v2'})) {
                $picture = $info->plugin('MP3')->mp3()->{'ID3v2'}->frame_select_by_descr("APIC");
        }
}

# print the information
printf("{title:\"%s\",artist:\"%s\",album:\"%s\",length:%u,cover:%u,url:\"%s\"}\n",
  $info->has_title() ? quote($info->get_title()) : '',
  $info->has_artist() ? quote($info->get_artist()) : '',
  $info->has_album() ? quote($info->get_album()) : '',
  $info->has_duration() ? $info->get_duration() : 0,
  defined($picture) ? 1 : 0,
  $info->has_url() ? $info->get_url() : '',
);

# write out the photo
if($picture) {
  my $image = new Image::Magick;
  $image->BlobToImage($picture->{'_Data'});
  $image->Resize('height'=>256,'width'=>256);
  $image->Write('static/images/'.$opt_i.'.jpg');
}

$info->close();

sub quote {
  my ($string) = $_[0];
  $string =~ s/&/&amp;/g;
  $string =~ s/"/&quot;/g;
  $string =~ s/</&lt;/g;
  $string =~ s/>/&gt;/g;
  return $string;
}
